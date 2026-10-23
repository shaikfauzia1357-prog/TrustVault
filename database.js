
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "trustvault.db"));

db.pragma("foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id)
    );
`);

const documentColumns = db.prepare(
    "PRAGMA table_info(documents)"
).all();
if (!documentColumns.some(column => column.name === "category")) {
    db.exec(`
        ALTER TABLE documents
        ADD COLUMN category TEXT NOT NULL DEFAULT 'General'
    `);
}

if (!documentColumns.some(column => column.name === "user_id")) {
    db.exec("ALTER TABLE documents ADD COLUMN user_id INTEGER REFERENCES users(id)");
}
const userColumns = db.prepare(
    "PRAGMA table_info(users)"
).all();

if (!userColumns.some(column => column.name === "role")) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN role TEXT NOT NULL DEFAULT 'owner'
    `);
}
db.exec(`
    CREATE TABLE IF NOT EXISTS document_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL
            CHECK (permission IN ('read', 'edit')),
        granted_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (document_id, user_id),
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id)
    );
`);
const adminExists = db.prepare(`
    SELECT id FROM users WHERE username = ?
`).get("fauzia_sk");

if (adminExists) {
    db.prepare(`
        UPDATE users
        SET role = 'admin'
        WHERE username = ?
    `).run("fauzia_sk");
}
module.exports = db;
