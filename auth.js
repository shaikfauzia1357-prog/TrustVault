
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const db = require("./database");

const router = express.Router();

router.use(express.json());

router.post("/register", async (req, res) => {
    const { username, password } = req.body || {};

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
        password.length < 8 ||
        password.length > 72
    ) {
        return res.status(400).json({
            message: "Use a username of 3–30 letters, numbers or underscores, and a password of 8–72 characters."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        db.prepare(`
            INSERT INTO users (username, password_hash)
            VALUES (?, ?)
        `).run(username, passwordHash);

        res.status(201).json({
            message: "Account created successfully. You can now log in."
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                message: "That username is already registered."
            });
        }

        console.error("Registration error:", error.message);
        res.status(500).json({
            message: "Could not create account."
        });
    }
});

router.post("/login", (req, res) => {
    const { username, password } = req.body || {};

    if (
        typeof username !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            message: "Enter your username and password."
        });
    }

    const user = db.prepare(`
        SELECT id, username, password_hash
        FROM users
        WHERE username = ?
    `).get(username);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({
            message: "Invalid username or password."
        });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
        message: "Login successful!",
        username: user.username
    });
});

router.get("/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in."
        });
    }

    res.json({
        id: req.session.userId,
        username: req.session.username
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Could not log out."
            });
        }

        res.clearCookie("connect.sid");
        res.json({
            message: "Logged out successfully."
        });
    });
});

module.exports = router;
