
const bcrypt = require("bcryptjs");
const express = require("express");
const db = require("./database");

const router = express.Router();

router.use(express.json());

router.post("/register", async (req, res) => {
    const { username, password } = req.body || {};

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !/^[a-zA-Z0-9_]{3,30}$/.test(username) ||
        password.length < 8
    ) {
        return res.status(400).json({
            message:
                "Use a username of 3–30 letters, numbers or underscores and a password of at least 8 characters."
        });
    }

    try {
        const existingUser = db
            .prepare("SELECT id FROM users WHERE username = ?")
            .get(username);

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        db.prepare(`
            INSERT INTO users (username, password_hash)
            VALUES (?, ?)
        `).run(username, passwordHash);

        return res.status(201).json({
            message: "Account created successfully. Please log in."
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            message: "Could not create the account."
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

    try {
        const user = db.prepare(`
            SELECT id, username, password_hash
            FROM users
            WHERE username = ?
        `).get(username);

        if (
            !user ||
            !bcrypt.compareSync(password, user.password_hash)
        ) {
            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        req.session.regenerate((error) => {
            if (error) {
                return res.status(500).json({
                    message: "Could not create a secure session."
                });
            }

            req.session.userId = user.id;
            req.session.username = user.username;

            req.session.save((saveError) => {
                if (saveError) {
                    return res.status(500).json({
                        message: "Could not save the login session."
                    });
                }

                return res.json({
                    message: "Login successful!",
                    username: user.username
                });
            });
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Login failed. Please try again."
        });
    }
});

router.get("/me", (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            message: "Please log in first."
        });
    }

    return res.json({
        userId: req.session.userId,
        username: req.session.username
    });
});

router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({
            message: "Logged out successfully."
        });
    }

    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                message: "Could not log out."
            });
        }

        res.clearCookie("connect.sid", {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        });

        return res.json({
            message: "Logged out successfully."
        });
    });
});

module.exports = router;
