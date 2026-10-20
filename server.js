const session = require("express-session");
const authRouter = require("./auth");
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./database");

const app = express();
const PORT = 3000;

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "local-development-secret-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 60 * 60 * 1000
    }
}));

app.use("/auth", authRouter);

const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }
    next();
}
app.post("/upload", requireLogin, (req, res, next) => {
    upload.single("document")(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                message: "Upload failed. Please choose a file under 5 MB."
            });
        }

        next();
    });
}, (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: "Please select a document."
        });
    }

    try {
        const result = db.prepare(`
    INSERT INTO documents (user_id, original_name, stored_name)
    VALUES (?, ?, ?)
`).run(
    req.session.userId,
    req.file.originalname,
    req.file.filename
);

        db.prepare(`
            INSERT INTO audit_logs (document_id, action)
            VALUES (?, ?)
        `).run(result.lastInsertRowid, "DOCUMENT_UPLOADED");

        res.json({
            message: "Document uploaded and recorded successfully!",
            filename: req.file.originalname
        });
    } catch (error) {
        fs.unlink(req.file.path, () => {});
        console.error("Database error:", error.message);

        res.status(500).json({
            message: "Could not save document details."
        });
    }
});
    

app.get("/documents", requireLogin, (req, res) => {
    const documents = db.prepare(`
        SELECT id, original_name, uploaded_at
        FROM documents
        WHERE user_id = ?
        ORDER BY id DESC
    `).all(req.session.userId);

    res.json(documents);
});


app.get("/download/:id", requireLogin, (req, res) => {
    const document = db.prepare(`
        SELECT original_name, stored_name
        FROM documents
        WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.userId);

    if (!document) {
        return res.status(404).json({
            message: "Document not found."
        });
    }

    const filePath = path.join(uploadDir, document.stored_name);

    res.download(filePath, document.original_name, (err) => {
        if (err && !res.headersSent) {
            res.status(500).json({
                message: "Could not download document."
            });
        }
    });
});
app.get("/audit-logs", requireLogin, (req, res) => {
    const logs = db.prepare(`
        SELECT
            audit_logs.id,
            documents.original_name,
            audit_logs.action,
            audit_logs.created_at
        FROM audit_logs
        INNER JOIN documents
            ON audit_logs.document_id = documents.id
        WHERE documents.user_id = ?
        ORDER BY audit_logs.id DESC
    `).all(req.session.userId);

    res.json(logs);
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`TrustVault running at http://localhost:${PORT}`);
    });
}

module.exports = app;

