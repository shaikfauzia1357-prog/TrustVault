
const session = require("express-session");
const authRouter = require("./auth");
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Render runs behind a reverse proxy.
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.use(
    session({
        name: "connect.sid",
        secret:
            process.env.SESSION_SECRET ||
            "local-development-secret-change-this",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 1000
        }
    })
);

app.use("/auth", authRouter);

const upload = multer({
    dest: uploadDir,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    next();
}

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Upload a document and create its upload audit record.
app.post(
    "/upload",
    requireLogin,
    (req, res, next) => {
        upload.single("document")(req, res, (err) => {
            if (err) {
                const message =
                    err.code === "LIMIT_FILE_SIZE"
                        ? "File must be under 5 MB."
                        : "Upload failed. Please try again.";

                return res.status(400).json({ message });
            }

            next();
        });
    },
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a document."
            });
        }

        try {
            const result = db.prepare(`
                INSERT INTO documents
                    (user_id, original_name, stored_name)
                VALUES (?, ?, ?)
            `).run(
                req.session.userId,
                req.file.originalname,
                req.file.filename
            );

            db.prepare(`
                INSERT INTO audit_logs (document_id, action)
                VALUES (?, ?)
            `).run(
                result.lastInsertRowid,
                "DOCUMENT_UPLOADED"
            );

            return res.json({
                message: "Document uploaded and recorded successfully!",
                filename: req.file.originalname
            });
        } catch (error) {
            fs.unlink(req.file.path, () => {});
            console.error("Upload database error:", error.message);

            return res.status(500).json({
                message: "Could not save document details."
            });
        }
    }
);

// Only show documents belonging to the logged-in user.
app.get("/documents", requireLogin, (req, res) => {
    try {
        const documents = db.prepare(`
            SELECT id, original_name, uploaded_at
            FROM documents
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(req.session.userId);

        return res.json(documents);
    } catch (error) {
        console.error("Documents error:", error.message);

        return res.status(500).json({
            message: "Could not load documents."
        });
    }
});

// Only the owner can download a document.
app.get("/download/:id", requireLogin, (req, res) => {
    const documentId = Number(req.params.id);

    if (!Number.isSafeInteger(documentId) || documentId < 1) {
        return res.status(400).json({
            message: "Invalid document ID."
        });
    }

    try {
        const document = db.prepare(`
            SELECT id, original_name, stored_name
            FROM documents
            WHERE id = ? AND user_id = ?
        `).get(documentId, req.session.userId);

        if (!document) {
            return res.status(404).json({
                message: "Document not found."
            });
        }

        const filePath = path.join(uploadDir, document.stored_name);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "The stored file is unavailable."
            });
        }

        res.download(filePath, document.original_name, (err) => {
            if (err) {
                if (!res.headersSent) {
                    res.status(500).json({
                        message: "Could not download document."
                    });
                }

                return;
            }

            try {
                db.prepare(`
                    INSERT INTO audit_logs (document_id, action)
                    VALUES (?, ?)
                `).run(document.id, "DOCUMENT_DOWNLOADED");
            } catch (error) {
                console.error("Download audit error:", error.message);
            }
        });
    } catch (error) {
        console.error("Download error:", error.message);

        if (!res.headersSent) {
            return res.status(500).json({
                message: "Could not download document."
            });
        }
    }
});

// Only show audit records for the logged-in user's documents.
app.get("/audit-logs", requireLogin, (req, res) => {
    try {
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

        return res.json(logs);
    } catch (error) {
        console.error("Audit logs error:", error.message);

        return res.status(500).json({
            message: "Could not load the audit trail."
        });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`TrustVault running at http://localhost:${PORT}`);
    });
}

module.exports = app;
