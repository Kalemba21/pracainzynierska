const bcrypt = require("bcryptjs");
const db = require("./db");

const { findUserByEmail, createUser } = require("./AuthStore");

async function ensureDefaultAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const username = process.env.ADMIN_USERNAME || "Admin";

    if (!email || !password) {
        console.log("[admin] Pomiń seed admina – brak ADMIN_EMAIL lub ADMIN_PASSWORD w .env");
        return;
    }

    try {
        const existing = await findUserByEmail(email);

        if (existing) {
            if (!existing.isAdmin) {
                await db.query(`UPDATE app_user SET is_admin = true WHERE id = $1`, [existing.id]);
                console.log("[admin] Istniejący użytkownik oznaczony jako admin:", email);
            } else {
                console.log("[admin] Admin już istnieje:", email);
            }
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await createUser({
            email,
            username,
            passwordHash,
            isAdmin: true,
        });

        console.log("[admin] Utworzono domyślnego admina:", user.email);
    } catch (err) {
        console.error("[admin] Błąd ensureDefaultAdmin:", err);
    }
}

module.exports = { ensureDefaultAdmin };
