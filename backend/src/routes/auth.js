const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { findUserByEmail, createUser } = require("../AuthStore");
const { BOOT_ID, getJwtSecret } = require("../jwtSession");

const router = express.Router();

function createToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: !!user.isAdmin,
        bootId: BOOT_ID,
    };

    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: "7d",
    });
}
router.post("/register", async (req, res) => {
    const { email, password, username } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: "Wymagane pola: email, password" });
    }

    const trimmedEmail = String(email).trim();
    const trimmedUsername = (username || "").trim() || trimmedEmail.split("@")[0];

    try {
        const existing = await findUserByEmail(trimmedEmail);
        if (existing) {
            return res.status(409).json({ error: "Użytkownik z takim emailem już istnieje" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser({
            email: trimmedEmail,
            username: trimmedUsername,
            passwordHash,
            isAdmin: false,
        });

        const token = createToken(user);

        return res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: !!user.isAdmin,
            },
        });
    } catch (err) {
        console.error("Błąd /api/auth/register:", err);
        return res.status(500).json({
            error: "Nie udało się utworzyć użytkownika",
            details: err.message,
        });
    }
});
router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).json({ error: "Wymagane pola: email, password" });
    }

    try {
        const user = await findUserByEmail(String(email).trim());
        if (!user) {
            return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: "Nieprawidłowe dane logowania" });
        }

        const token = createToken(user);

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: !!user.isAdmin,
            },
        });
    } catch (err) {
        console.error("Błąd /api/auth/login:", err);
        return res.status(500).json({ error: "Błąd logowania", details: err.message });
    }
});

module.exports = router;
