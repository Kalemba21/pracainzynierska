const express = require("express");
const router = express.Router();

const db = require("../db");
const { authRequired } = require("../middleware/authMiddleware");

const bcrypt = require("bcryptjs");

function adminOnly(req, res, next) {
    if (!req.user) return res.status(401).json({ ok: false, error: "Brak autoryzacji" });

    const isAdmin =
        req.user.role === "admin" ||
        req.user.isAdmin === true ||
        req.user.is_admin === true;

    if (!isAdmin) return res.status(403).json({ ok: false, error: "Brak uprawnien admin" });
    return next();
}

function normEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function usernameFromEmail(email) {
    const e = normEmail(email);
    const base = (e.split("@")[0] || "user").trim();
    return base.slice(0, 32) || "user";
}

async function countAdmins() {
    const r = await db.query(`SELECT COUNT(*)::int AS cnt FROM app_user WHERE is_admin = true`);
    return r.rows?.[0]?.cnt ?? 0;
}

router.get("/users", authRequired, adminOnly, async (req, res) => {
    try {
        await db.ready;

        const result = await db.query(
            `
                SELECT id, email, username, created_at, is_admin
                FROM app_user
                ORDER BY created_at DESC
            `
        );

        res.json({ ok: true, users: result.rows });
    } catch (err) {
        console.error("Błąd GET /api/admin/users:", err);
        res.status(500).json({ ok: false, error: "Server error", details: err.message });
    }
});

router.post("/users", authRequired, adminOnly, async (req, res) => {
    try {
        await db.ready;

        const email = normEmail(req.body?.email);
        const password = String(req.body?.password || "");
        const username = String(req.body?.username || usernameFromEmail(email)).trim().slice(0, 32);

        if (!email || !email.includes("@")) {
            return res.status(400).json({ ok: false, error: "Podaj poprawny email" });
        }
        if (password.length < 6) {
            return res.status(400).json({ ok: false, error: "Haslo musi miec min. 6 znakow" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const r = await db.query(
            `
                INSERT INTO app_user (email, username, password_hash, is_admin)
                VALUES ($1, $2, $3, false)
                    RETURNING id, email, username, created_at, is_admin
            `,
            [email, username, passwordHash]
        );

        res.json({ ok: true, user: r.rows[0] });
    } catch (err) {
        console.error("Błąd POST /api/admin/users:", err);
        if (err?.code === "23505") {
            return res.status(409).json({ ok: false, error: "Uzytkownik z takim emailem juz istnieje" });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
});



router.patch("/users/:id", authRequired, adminOnly, async (req, res) => {
    const targetId = String(req.params.id || "");

    try {
        await db.ready;

        const current = await db.query(
            `SELECT id, email, username, created_at, is_admin FROM app_user WHERE id = $1`,
            [targetId]
        );

        if (current.rowCount === 0) {
            return res.status(404).json({ ok: false, error: "Nie znaleziono uzytkownika" });
        }

        const curRow = current.rows[0];

        const body = req.body || {};
        const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");
        const hasUsername = Object.prototype.hasOwnProperty.call(body, "username");
        const hasPassword = Object.prototype.hasOwnProperty.call(body, "password");

        const nextEmail = hasEmail ? normEmail(body.email) : curRow.email;



        const rawUsername = hasUsername ? String(body.username ?? "").trim() : curRow.username;
        const nextUsername = (rawUsername || usernameFromEmail(nextEmail)).slice(0, 32);

        if (!nextEmail || !String(nextEmail).includes("@")) {
            return res.status(400).json({ ok: false, error: "Podaj poprawny email" });
        }

        let passwordHash = null;
        if (hasPassword) {
            const password = String(body.password || "");
            if (password.length > 0 && password.length < 6) {
                return res.status(400).json({ ok: false, error: "Haslo musi miec min. 6 znakow" });
            }
            if (password.length > 0) {
                passwordHash = await bcrypt.hash(password, 10);
            }
        }

        const sets = [];
        const params = [targetId];
        let idx = 2;

        if (hasEmail) {
            sets.push(`email = $${idx++}`);
            params.push(nextEmail);
        }
        if (hasUsername) {
            sets.push(`username = $${idx++}`);
            params.push(nextUsername);
        }
        if (passwordHash) {
            sets.push(`password_hash = $${idx++}`);
            params.push(passwordHash);
        }

        if (sets.length === 0) {
            return res.json({
                ok: true,
                user: {
                    id: curRow.id,
                    email: curRow.email,
                    username: curRow.username,
                    created_at: curRow.created_at,
                    is_admin: curRow.is_admin,
                },
            });
        }

        const r = await db.query(
            `
                UPDATE app_user
                SET ${sets.join(", ")}
                WHERE id = $1
                    RETURNING id, email, username, created_at, is_admin
            `,
            params
        );

        return res.json({ ok: true, user: r.rows[0] });
    } catch (err) {
        console.error("Błąd PATCH /api/admin/users/:id:", err);
        if (err?.code === "23505") {
            return res.status(409).json({ ok: false, error: "Uzytkownik z takim emailem juz istnieje" });
        }
        return res.status(500).json({ ok: false, error: err.message });
    }
});

router.patch("/users/:id/admin", authRequired, adminOnly, async (req, res) => {
    const targetId = String(req.params.id || "");
    const nextIsAdmin = !!req.body?.isAdmin;

    try {
        await db.ready;

        if (req.user?.id && String(req.user.id) === targetId) {
            return res.status(400).json({ ok: false, error: "Nie mozesz zmieniac roli samego siebie" });
        }

        const target = await db.query(`SELECT id, is_admin FROM app_user WHERE id = $1`, [targetId]);
        if (target.rowCount === 0) {
            return res.status(404).json({ ok: false, error: "Nie znaleziono uzytkownika" });
        }

        const wasAdmin = !!target.rows[0].is_admin;

        if (wasAdmin && !nextIsAdmin) {
            const admins = await countAdmins();
            if (admins <= 1) {
                return res.status(400).json({
                    ok: false,
                    error: "Musi zostac przynajmniej jeden admin. Nie mozna odebrac roli ostatniemu adminowi.",
                });
            }
        }

        const r = await db.query(
            `
                UPDATE app_user
                SET is_admin = $2
                WHERE id = $1
                    RETURNING id, email, username, created_at, is_admin
            `,
            [targetId, nextIsAdmin]
        );

        res.json({ ok: true, user: r.rows[0] });
    } catch (err) {
        console.error("Błąd PATCH /api/admin/users/:id/admin:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.delete("/users/:id", authRequired, adminOnly, async (req, res) => {
    const targetId = String(req.params.id || "");

    try {
        await db.ready;

        if (req.user?.id && String(req.user.id) === targetId) {
            return res.status(400).json({ ok: false, error: "Nie mozesz usunac samego siebie" });
        }

        const target = await db.query(`SELECT id, is_admin FROM app_user WHERE id = $1`, [targetId]);
        if (target.rowCount === 0) {
            return res.status(404).json({ ok: false, error: "Nie znaleziono uzytkownika" });
        }

        const isAdminTarget = !!target.rows[0].is_admin;
        if (isAdminTarget) {
            const admins = await countAdmins();
            if (admins <= 1) {
                return res.status(400).json({
                    ok: false,
                    error: "Nie mozna usunac ostatniego admina. Musi zostac przynajmniej jeden admin.",
                });
            }
        }

        const del = await db.query(`DELETE FROM app_user WHERE id = $1 RETURNING id`, [targetId]);
        res.json({ ok: true, deletedId: del.rows[0].id });
    } catch (err) {
        console.error("Błąd DELETE /api/admin/users/:id:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
