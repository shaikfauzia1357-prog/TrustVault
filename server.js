
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const authRouter = require("./auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const db = require("./database");
const { initializeDatabase } = require("./database");

const app = express();
console.log("REGISTERED ROUTE CHECK - FAUZIA 123");
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "trustvault-local-dev-secret",
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

// Check whether the user is logged in.
function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    next();
}

// Check the user's role in PostgreSQL.
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        try {
            const result = await db.query(
                "SELECT role FROM users WHERE id = $1",
                [req.session.userId]
            );

            const user = result.rows[0];

            if (!user || !allowedRoles.includes(user.role)) {
                return res.status(403).json({
                    message: "You do not have permission to perform this action."
                });
            }

            next();
        } catch (error) {
            console.error("Role check error:", error.message);

            return res.status(500).json({
                message: "Could not verify user role."
            });
        }
    };
}

// Basic server test.
app.get("/ping-test", (req, res) => {
    res.send("TrustVault server is responding");
});

// Admin: view activity across documents.
app.get(
    "/admin/audit-logs",
    requireLogin,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await db.query(`
                SELECT
                    audit_logs.id,
                    documents.original_name,
                    users.username AS owner,
                    audit_logs.action,
                    audit_logs.created_at
                FROM audit_logs
                LEFT JOIN documents
                    ON audit_logs.document_id = documents.id
                LEFT JOIN users
                    ON documents.user_id = users.id
                ORDER BY audit_logs.id DESC
            `);

            return res.json(result.rows);
        } catch (error) {
            console.error("Admin audit logs error:", error.message);

            return res.status(500).json({
                message: "Could not load admin audit logs."
            });
        }
    }
);


// Admin dashboard test route.
app.get(
    "/admin/dashboard",
    requireLogin,
    requireRole("admin"),
    (req, res) => {
        res.sendFile(path.join(__dirname, "views", "admin.html"));
    }
);
console.log(
    "REGISTERED ROUTES:",
    app.router.stack
        .filter(layer => layer.route)
        .map(layer => layer.route.path)
);

// File storage configuration.
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        callback(null, crypto.randomUUID());
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

// Upload a document.
app.post(
    "/upload",
    requireLogin,
    (req, res, next) => {
        upload.single("document")(req, res, (error) => {
            if (error) {
                return res.status(400).json({
                    message:
                        error.code === "LIMIT_FILE_SIZE"
                            ? "File size must not exceed 5 MB."
                            : "File upload failed."
                });
            }

            next();
        });
    },
    async (req, res) => {
        console.log("ADMIN DASHBOARD REQUEST RECEIVED");
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a file."
            });
        }

        try {
            const result = await db.query(
                `INSERT INTO documents
                    (user_id, original_name, stored_name, category)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [
                    req.session.userId,
                    path.basename(req.file.originalname),
                    req.file.filename,
                    "General"
                ]
            );

            await db.query(
                `INSERT INTO audit_logs (document_id, action)
                 VALUES ($1, $2)`,
                [result.rows[0].id, "DOCUMENT_UPLOADED"]
            );

            return res.json({
                message: "Document uploaded and recorded successfully."
            });
        } catch (error) {
            try {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (cleanupError) {
                console.error("File cleanup error:", cleanupError.message);
            }

            console.error("Upload error:", error.message);

            return res.status(500).json({
                message: "Could not save the document."
            });
        }
    }
);

// Replace a document. Owner or a user with edit permission can do this.
app.put(
    "/documents/:id/edit",
    requireLogin,
    (req, res, next) => {
        upload.single("document")(req, res, (error) => {
            if (error) {
                return res.status(400).json({
                    message:
                        error.code === "LIMIT_FILE_SIZE"
                            ? "File size must not exceed 5 MB."
                            : "File upload failed."
                });
            }

            next();
        });
    },
    async (req, res) => {
        const documentId = Number(req.params.id);

        if (!Number.isSafeInteger(documentId) || documentId < 1) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                message: "Invalid document ID."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Please select a replacement file."
            });
        }

        let oldStoredName;

        try {
            const result = await db.query(
                `SELECT
                    documents.id,
                    documents.stored_name
                 FROM documents
                 LEFT JOIN document_permissions
                    ON document_permissions.document_id = documents.id
                    AND document_permissions.user_id = $1
                 WHERE documents.id = $2
                    AND (
                        documents.user_id = $1
                        OR document_permissions.permission = 'edit'
                    )`,
                [req.session.userId, documentId]
            );

            const document = result.rows[0];

            if (!document) {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }

                return res.status(403).json({
                    message: "You do not have permission to edit this document."
                });
            }

            oldStoredName = document.stored_name;

            await db.query(
                `UPDATE documents
                 SET original_name = $1, stored_name = $2
                 WHERE id = $3`,
                [
                    path.basename(req.file.originalname),
                    req.file.filename,
                    documentId
                ]
            );

            await db.query(
                `INSERT INTO audit_logs (document_id, action)
                 VALUES ($1, $2)`,
                [documentId, "DOCUMENT_EDITED"]
            );

            const oldFilePath = path.join(uploadDir, oldStoredName);

            if (
                fs.existsSync(oldFilePath) &&
                oldFilePath !== req.file.path
            ) {
                fs.unlinkSync(oldFilePath);
            }

            return res.json({
                message: "Document updated successfully."
            });
        } catch (error) {
            console.error("Document edit error:", error.message);

            try {
                if (req.file && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (cleanupError) {
                console.error("File cleanup error:", cleanupError.message);
            }

            return res.status(500).json({
                message: "Could not update the document."
            });
        }
    }
);

// Grant read or edit access. Only the document owner can do this.
app.post(
    "/documents/:id/permissions",
    requireLogin,
    async (req, res) => {
        const documentId = Number(req.params.id);
        const { username, permission } = req.body || {};

        if (!Number.isSafeInteger(documentId) || documentId < 1) {
            return res.status(400).json({
                message: "Invalid document ID."
            });
        }

        if (
            typeof username !== "string" ||
            !username.trim() ||
            !["read", "edit"].includes(permission)
        ) {
            return res.status(400).json({
                message: "Provide a username and read or edit permission."
            });
        }

        try {
            const documentResult = await db.query(
                `SELECT id
                 FROM documents
                 WHERE id = $1 AND user_id = $2`,
                [documentId, req.session.userId]
            );

            if (documentResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            const userResult = await db.query(
                `SELECT id
                 FROM users
                 WHERE username = $1`,
                [username.trim()]
            );

            const targetUser = userResult.rows[0];

            if (!targetUser) {
                return res.status(404).json({
                    message: "That username does not exist."
                });
            }

            if (Number(targetUser.id) === Number(req.session.userId)) {
                return res.status(400).json({
                    message: "You already own this document."
                });
            }

            await db.query(
                `INSERT INTO document_permissions
                    (document_id, user_id, permission, granted_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (document_id, user_id)
                 DO UPDATE SET
                    permission = EXCLUDED.permission,
                    granted_by = EXCLUDED.granted_by,
                    created_at = CURRENT_TIMESTAMP`,
                [
                    documentId,
                    targetUser.id,
                    permission,
                    req.session.userId
                ]
            );

            await db.query(
                `INSERT INTO audit_logs (document_id, action)
                 VALUES ($1, $2)`,
                [
                    documentId,
                    "PERMISSION_GRANTED_" + permission.toUpperCase()
                ]
            );

            return res.json({
                message: "Document permission granted successfully."
            });
        } catch (error) {
            console.error("Grant permission error:", error.message);

            return res.status(500).json({
                message: "Could not grant document permission."
            });
        }
    }
);

// Revoke a user's access. Only the document owner can do this.
app.delete(
    "/documents/:id/permissions/:username",
    requireLogin,
    async (req, res) => {
        const documentId = Number(req.params.id);
        const username = req.params.username;

        if (!Number.isSafeInteger(documentId) || documentId < 1) {
            return res.status(400).json({
                message: "Invalid document ID."
            });
        }

        try {
            const documentResult = await db.query(
                `SELECT id
                 FROM documents
                 WHERE id = $1 AND user_id = $2`,
                [documentId, req.session.userId]
            );

            if (documentResult.rows.length === 0) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            const userResult = await db.query(
                `SELECT id FROM users WHERE username = $1`,
                [username]
            );

            const targetUser = userResult.rows[0];

            if (!targetUser) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const result = await db.query(
                `DELETE FROM document_permissions
                 WHERE document_id = $1 AND user_id = $2`,
                [documentId, targetUser.id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    message: "No permission found for this user."
                });
            }

            await db.query(
                `INSERT INTO audit_logs (document_id, action)
                 VALUES ($1, $2)`,
                [documentId, "PERMISSION_REVOKED"]
            );

            return res.json({
                message: "Document access revoked successfully."
            });
        } catch (error) {
            console.error("Revoke permission error:", error.message);

            return res.status(500).json({
                message: "Could not revoke document access."
            });
        }
    }
);

// List owned documents and documents shared with the logged-in user.
app.get("/documents", requireLogin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT DISTINCT
                documents.id,
                documents.original_name,
                documents.uploaded_at,
                users.username AS owner,
                CASE
                    WHEN documents.user_id = $1 THEN 'owner'
                    ELSE document_permissions.permission
                END AS permission
             FROM documents
             INNER JOIN users
                ON documents.user_id = users.id
             LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = $2
             WHERE documents.user_id = $3
                OR document_permissions.user_id = $4
             ORDER BY documents.id DESC`,
            [
                req.session.userId,
                req.session.userId,
                req.session.userId,
                req.session.userId
            ]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error("Documents error:", error.message);

        return res.status(500).json({
            message: "Could not load documents."
        });
    }
});

// Search documents by name, owner, category, and upload date.
app.get("/documents/search", requireLogin, async (req, res) => {
    const name = String(req.query.name || "").trim();
    const owner = String(req.query.owner || "").trim();
    const category = String(req.query.category || "").trim();
    const date = String(req.query.date || "").trim();

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
            message: "Date must use YYYY-MM-DD format."
        });
    }

    try {
        const result = await db.query(
            `SELECT DISTINCT
                documents.id,
                documents.original_name,
                documents.category,
                documents.uploaded_at,
                users.username AS owner,
                CASE
                    WHEN documents.user_id = $1 THEN 'owner'
                    ELSE document_permissions.permission
                END AS permission
             FROM documents
             INNER JOIN users
                ON documents.user_id = users.id
             LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = $2
             WHERE (
                documents.user_id = $3
                OR document_permissions.permission IN ('read', 'edit')
             )
             AND documents.original_name ILIKE $4
             AND users.username ILIKE $5
             AND documents.category ILIKE $6
             AND ($7 = '' OR documents.uploaded_at::date = $7::date)
             ORDER BY documents.id DESC`,
            [
                req.session.userId,
                req.session.userId,
                req.session.userId,
                `%${name}%`,
                `%${owner}%`,
                `%${category}%`,
                date
            ]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error("Document search error:", error.message);

        return res.status(500).json({
            message: "Could not search documents."
        });
    }
});

// Owners and users with read/edit permission can download.
app.get("/download/:id", requireLogin, async (req, res) => {
    const documentId = Number(req.params.id);

    if (!Number.isSafeInteger(documentId) || documentId < 1) {
        return res.status(400).json({
            message: "Invalid document ID."
        });
    }

    try {
        const result = await db.query(
            `SELECT
                documents.id,
                documents.original_name,
                documents.stored_name
             FROM documents
             LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = $1
             WHERE documents.id = $2
                AND (
                    documents.user_id = $3
                    OR document_permissions.permission IN ('read', 'edit')
                )`,
            [
                req.session.userId,
                documentId,
                req.session.userId
            ]
        );

        const document = result.rows[0];

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

        await db.query(
            `INSERT INTO audit_logs (document_id, action)
             VALUES ($1, $2)`,
            [document.id, "DOCUMENT_DOWNLOADED"]
        );

        return res.download(filePath, document.original_name, (error) => {
            if (error && !res.headersSent) {
                res.status(500).json({
                    message: "Could not download document."
                });
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

// Delete a document. Only its owner can delete it.
app.delete("/documents/:id", requireLogin, async (req, res) => {
    const documentId = Number(req.params.id);

    if (!Number.isSafeInteger(documentId) || documentId < 1) {
        return res.status(400).json({
            message: "Invalid document ID."
        });
    }

    try {
        const result = await db.query(
            `SELECT id, stored_name
             FROM documents
             WHERE id = $1 AND user_id = $2`,
            [documentId, req.session.userId]
        );

        const document = result.rows[0];

        if (!document) {
            return res.status(404).json({
                message: "Document not found or you are not its owner."
            });
        }

        await db.query(
            `INSERT INTO audit_logs (document_id, action)
             VALUES ($1, $2)`,
            [documentId, "DOCUMENT_DELETED"]
        );

        await db.query(
            `DELETE FROM document_permissions
             WHERE document_id = $1`,
            [documentId]
        );

        await db.query(
            `DELETE FROM documents
             WHERE id = $1 AND user_id = $2`,
            [documentId, req.session.userId]
        );

        const filePath = path.join(uploadDir, document.stored_name);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return res.json({
            message: "Document deleted successfully."
        });
    } catch (error) {
        console.error("Document delete error:", error.message);

        return res.status(500).json({
            message: "Could not delete the document."
        });
    }
});

// Show audit records for the logged-in user's own documents.
app.get("/audit-logs", requireLogin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
                audit_logs.id,
                documents.original_name,
                audit_logs.action,
                audit_logs.created_at
             FROM audit_logs
             INNER JOIN documents
                ON audit_logs.document_id = documents.id
             WHERE documents.user_id = $1
             ORDER BY audit_logs.id DESC`,
            [req.session.userId]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error("Audit logs error:", error.message);

        return res.status(500).json({
            message: "Could not load the audit trail."
        });
    }
});

// Start the server after the database tables are initialized.
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`TrustVault running at http://localhost:${PORT}`);
                console.log("Database tables initialized.");
            });
        })
        .catch((error) => {
            console.error("Database initialization failed:", error.message);
            process.exit(1);
        });
}

module.exports = app;
