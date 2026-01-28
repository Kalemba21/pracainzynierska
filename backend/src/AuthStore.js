const db = require("./db");
async function findUserByEmail(email) {
    await db.ready;

    const res = await db.query(
        `
            SELECT id, email, username, password_hash, created_at, is_admin
            FROM app_user
            WHERE lower(email) = lower($1)
                LIMIT 1
        `,
        [email]
    );

    if (res.rows.length === 0) {
        return null;
    }

    const row = res.rows[0];

    return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        isAdmin: row.is_admin,
    };
}
async function createUser({ email, username, passwordHash, isAdmin = false }) {
    await db.ready;

    const res = await db.query(
        `
            INSERT INTO app_user (email, username, password_hash, is_admin)
            VALUES ($1, $2, $3, $4)
                RETURNING id, email, username, password_hash, created_at, is_admin
        `,
        [email, username, passwordHash, isAdmin]
    );

    const row = res.rows[0];

    return {
        id: row.id,
        email: row.email,
        username: row.username,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
        isAdmin: row.is_admin,
    };
}

module.exports = {
    findUserByEmail,
    createUser,
};
