const crypto = require("crypto");
const BOOT_ID = crypto.randomBytes(16).toString("hex");

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("Brak JWT_SECRET w .env");
    }
    return secret;
}

module.exports = { BOOT_ID, getJwtSecret };
