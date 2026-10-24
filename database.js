
require("dotenv").config();
const { Pool } = require("pg");
const crypto = require("crypto");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
}

const db = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function initializeDatabase() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            role TEXT NOT NULL DEFAULT 'owner'
        );

        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            category TEXT NOT NULL DEFAULT 'General'
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_permissions (
            id SERIAL PRIMARY KEY,
            document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            permission TEXT NOT NULL CHECK (permission IN ('read', 'edit')),
            granted_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (document_id, user_id)
        );
    `);

    await db.query(`
        ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS previous_hash TEXT;

        ALTER TABLE audit_logs
        ADD COLUMN IF NOT EXISTS entry_hash TEXT;
    `);
        const oldLogs = await db.query(`
        SELECT id, document_id, action, created_at
        FROM audit_logs
        WHERE entry_hash IS NULL
        ORDER BY id ASC
    `);

    const existingLogs = await db.query(`
        SELECT COUNT(*) AS total
        FROM audit_logs
        WHERE entry_hash IS NOT NULL
    `);

    if (
        Number(existingLogs.rows[0].total) === 0 &&
        oldLogs.rows.length > 0
    ) {
        let previousHash = "GENESIS";

        for (const entry of oldLogs.rows) {
            const entryHash = calculateAuditHash(entry, previousHash);

            await db.query(
                `UPDATE audit_logs
                 SET previous_hash = $1, entry_hash = $2
                 WHERE id = $3`,
                [previousHash, entryHash, entry.id]
            );

            previousHash = entryHash;
        }
    }

    const adminUsername = process.env.ADMIN_USERNAME;

    if (adminUsername) {
        await db.query(
            "UPDATE users SET role = 'admin' WHERE username = $1",
            [adminUsername]
        );
    }
}

function calculateAuditHash(entry, previousHash) {
    return crypto
        .createHash("sha256")
        .update(
            JSON.stringify({
                id: entry.id,
                document_id: entry.document_id,
                action: entry.action,
                created_at: entry.created_at,
                previous_hash: previousHash
            })
        )
        .digest("hex");
}

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
module.exports.calculateAuditHash = calculateAuditHash;
