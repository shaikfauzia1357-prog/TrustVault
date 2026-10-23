const express = require("express");
const session = require("express-session");
const authRouter = require("./auth");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");
const db = require("./database");

const app = express();
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

function requireLogin(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    next();
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({
                message: "Please log in first."
            });
        }

        if (!allowedRoles.includes(req.session.role)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
}

 // Admin-only route to view activity across all documents.
 app.get("/ping-test", (req, res) => {
    res.send("TrustVault server is responding");
});
app.get("/admin/audit-logs", (req, res, next) => {
    console.log("ADMIN ROUTE MATCHED");
    next();
}, requireRole("admin"), (req, res) => {
    console.log("ADMIN AUDIT ROUTE HIT");
    try {
        const logs = db.prepare(`
            SELECT
                audit_logs.id,
                documents.original_name,
                users.username AS owner,
                audit_logs.action,
                audit_logs.created_at
            FROM audit_logs
            INNER JOIN documents
                ON audit_logs.document_id = documents.id
            INNER JOIN users
                ON documents.user_id = users.id
            ORDER BY audit_logs.id DESC
        `).all();

        return res.json(logs);
    } catch (error) {
        console.error("Admin audit logs error:", error.message);
        return res.status(500).json({
            message: "Could not load admin audit logs."
        });
    }
});

app.get("/admin/dashboard", requireLogin, requireRole("admin"), (req, res) => {
    try {
        const totalUsers = db.prepare(
            "SELECT COUNT(*) AS count FROM users"
        ).get().count;

        const totalDocuments = db.prepare(
            "SELECT COUNT(*) AS count FROM documents"
        ).get().count;

        const sharedDocuments = db.prepare(
            "SELECT COUNT(DISTINCT document_id) AS count FROM document_permissions"
        ).get().count;

        const totalPermissions = db.prepare(
            "SELECT COUNT(*) AS count FROM document_permissions"
        ).get().count;

        return res.json({
            totalUsers,
            totalDocuments,
            sharedDocuments,
            totalPermissions
        });
    } catch (error) {
        console.error("Admin dashboard error:", error.message);
        return res.status(500).json({
            message: "Could not load admin dashboard."
        });
    }
});
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

// Upload a document
app.post(
    "/upload",
    requireLogin,
    (req, res, next) => {
        upload.single("document")(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    return res.status(400).json({
                        message:
                            error.code === "LIMIT_FILE_SIZE"
                                ? "File size must not exceed 5 MB."
                                : "File upload failed."
                    });
                }

                return res.status(400).json({
                    message: "File upload failed."
                });
            }

            next();
        });
    },
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select a file."
            });
        }

        try {
            const result = db.prepare(`
              INSERT INTO documents
    (user_id, original_name, stored_name, category)
VALUES (?, ?, ?, ?)`
            ).run(
    req.session.userId,
    path.basename(req.file.originalname),
    req.file.filename,
    "General"
);

            db.prepare(`
                INSERT INTO audit_logs (document_id, action)
                VALUES (?, ?)
            `).run(result.lastInsertRowid, "DOCUMENT_UPLOADED");

            return res.json({
                message: "Document uploaded and recorded successfully."
            });
        } catch (error) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error("Uploaded file cleanup error:", cleanupError.message);
            }

            console.error("Upload error:", error.message);
            return res.status(500).json({
                message: "Could not save the document."
            });
        }
    }
);// Replace a document. Only the owner or a user with edit permission can do this.
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
    (req, res) => {
        const documentId = Number(req.params.id);

        if (!Number.isSafeInteger(documentId) || documentId < 1) {
            if (req.file) fs.unlinkSync(req.file.path);

            return res.status(400).json({
                message: "Invalid document ID."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Please select a replacement file."
            });
        }

        try {
            const document = db.prepare(`
                SELECT
                    documents.id,
                    documents.user_id,
                    documents.stored_name
                FROM documents
                LEFT JOIN document_permissions
                    ON document_permissions.document_id = documents.id
                    AND document_permissions.user_id = ?
                WHERE documents.id = ?
                    AND (
                        documents.user_id = ?
                        OR document_permissions.permission = 'edit'
                    )
            `).get(
                req.session.userId,
                documentId,
                req.session.userId
            );

            if (!document) {
                fs.unlinkSync(req.file.path);

                return res.status(403).json({
                    message: "You do not have permission to edit this document."
                });
            }

            db.prepare(`
                UPDATE documents
                SET original_name = ?, stored_name = ?
                WHERE id = ?
            `).run(
                path.basename(req.file.originalname),
                req.file.filename,
                documentId
            );

            db.prepare(`
                INSERT INTO audit_logs (document_id, action)
                VALUES (?, ?)
            `).run(documentId, "DOCUMENT_EDITED");

            const oldFilePath = path.join(
                uploadDir,
                document.stored_name
            );

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

app.post("/documents/:id/permissions", requireLogin, requireRole("owner"), (req, res) => {
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
        const document = db.prepare(`
            SELECT id
            FROM documents
            WHERE id = ? AND user_id = ?
        `).get(documentId, req.session.userId);

        if (!document) {
            return res.status(404).json({
                message: "Document not found."
            });
        }

        const targetUser = db.prepare(`
            SELECT id
            FROM users
            WHERE username = ?
        `).get(username.trim());

        if (!targetUser) {
            return res.status(404).json({
                message: "That username does not exist."
            });
        }

        if (targetUser.id === req.session.userId) {
            return res.status(400).json({
                message: "You already own this document."
            });
        }

        db.prepare(`
            INSERT INTO document_permissions
                (document_id, user_id, permission, granted_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(document_id, user_id)
            DO UPDATE SET
                permission = excluded.permission,
                granted_by = excluded.granted_by,
                created_at = CURRENT_TIMESTAMP
        `).run(
            documentId,
            targetUser.id,
            permission,
            req.session.userId
        );

        db.prepare(`
            INSERT INTO audit_logs (document_id, action)
            VALUES (?, ?)
        `).run(
            documentId,
            "PERMISSION_GRANTED_" + permission.toUpperCase()
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
});

// Revoke a user's access. Only the document owner can do this.
app.delete(
    "/documents/:id/permissions/:username",
    requireLogin,
    (req, res) => {
        const documentId = Number(req.params.id);
        const username = req.params.username;

        if (!Number.isSafeInteger(documentId) || documentId < 1) {
            return res.status(400).json({
                message: "Invalid document ID."
            });
        }

        try {
            const document = db.prepare(`
                SELECT id
                FROM documents
                WHERE id = ? AND user_id = ?
            `).get(documentId, req.session.userId);

            if (!document) {
                return res.status(404).json({
                    message: "Document not found."
                });
            }

            const targetUser = db.prepare(`
                SELECT id FROM users WHERE username = ?
            `).get(username);

            if (!targetUser) {
                return res.status(404).json({
                    message: "User not found."
                });
            }

            const result = db.prepare(`
                DELETE FROM document_permissions
                WHERE document_id = ? AND user_id = ?
            `).run(documentId, targetUser.id);

            if (result.changes === 0) {
                return res.status(404).json({
                    message: "No permission found for this user."
                });
            }

            db.prepare(`
                INSERT INTO audit_logs (document_id, action)
                VALUES (?, ?)
            `).run(documentId, "PERMISSION_REVOKED");

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
app.get("/documents", requireLogin, (req, res) => {
    try {
        const documents = db.prepare(`
            SELECT DISTINCT
                documents.id,
                documents.original_name,
                documents.uploaded_at,
                users.username AS owner,
                CASE
                    WHEN documents.user_id = ? THEN 'owner'
                    ELSE document_permissions.permission
                END AS permission
            FROM documents
            INNER JOIN users
                ON documents.user_id = users.id
            LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = ?
            WHERE documents.user_id = ?
                OR document_permissions.user_id = ?
            ORDER BY documents.id DESC
        `).all(
            req.session.userId,
            req.session.userId,
            req.session.userId,
            req.session.userId
        );

        return res.json(documents);
    } catch (error) {
        console.error("Documents error:", error.message);
        return res.status(500).json({
            message: "Could not load documents."
        });
    }
});
// Search documents by name, owner, category, and upload date.
app.get("/documents/search", requireLogin, (req, res) => {
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
        const documents = db.prepare(`
            SELECT DISTINCT
                documents.id,
                documents.original_name,
                documents.category,
                documents.uploaded_at,
                users.username AS owner,
                CASE
                    WHEN documents.user_id = ? THEN 'owner'
                    ELSE document_permissions.permission
                END AS permission
            FROM documents
            INNER JOIN users
                ON documents.user_id = users.id
            LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = ?
            WHERE (
                documents.user_id = ?
                OR document_permissions.permission IN ('read', 'edit')
            )
            AND documents.original_name LIKE ?
            AND users.username LIKE ?
            AND documents.category LIKE ?
            AND (? = '' OR date(documents.uploaded_at) = date(?))
            ORDER BY documents.id DESC
        `).all(
            req.session.userId,
            req.session.userId,
            req.session.userId,
            `%${name}%`,
            `%${owner}%`,
            `%${category}%`,
            date,
            date
        );

        return res.json(documents);
    } catch (error) {
        console.error("Document search error:", error.message);
        return res.status(500).json({
            message: "Could not search documents."
        });
    }
});
// Owners and users with read/edit permission can download.
app.get("/download/:id", requireLogin, (req, res) => {
    const documentId = Number(req.params.id);

    if (!Number.isSafeInteger(documentId) || documentId < 1) {
        return res.status(400).json({
            message: "Invalid document ID."
        });
    }

    try {
        const document = db.prepare(`
            SELECT
                documents.id,
                documents.original_name,
                documents.stored_name
            FROM documents
            LEFT JOIN document_permissions
                ON document_permissions.document_id = documents.id
                AND document_permissions.user_id = ?
            WHERE documents.id = ?
                AND (
                    documents.user_id = ?
                    OR document_permissions.permission IN ('read', 'edit')
                )
        `).get(
            req.session.userId,
            documentId,
            req.session.userId
        );

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

        db.prepare(`
            INSERT INTO audit_logs (document_id, action)
            VALUES (?, ?)
        `).run(document.id, "DOCUMENT_DOWNLOADED");

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
app.delete("/documents/:id", requireLogin, (req, res) => {
    const documentId = Number(req.params.id);

    if (!Number.isSafeInteger(documentId) || documentId < 1) {
        return res.status(400).json({
            message: "Invalid document ID."
        });
    }

    try {
        const document = db.prepare(`
            SELECT id, stored_name
            FROM documents
            WHERE id = ? AND user_id = ?
        `).get(documentId, req.session.userId);

        if (!document) {
            return res.status(404).json({
                message: "Document not found or you are not its owner."
            });
        }

        db.prepare(`
            INSERT INTO audit_logs (document_id, action)
            VALUES (?, ?)
        `).run(documentId, "DOCUMENT_DELETED");

        db.prepare(`
            DELETE FROM document_permissions
            WHERE document_id = ?
        `).run(documentId);

        db.prepare(`
            DELETE FROM documents
            WHERE id = ? AND user_id = ?
        `).run(documentId, req.session.userId);

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
        console.log("Registered routes:", app.router.stack.filter(r => r.route).map(r => r.route.path));
    });
}

module.exports = app;