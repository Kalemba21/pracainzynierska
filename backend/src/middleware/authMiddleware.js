const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../jwtSession");

function authRequired(req, res, next) {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
        return res.status(401).json({ error: "Brak tokenu (Authorization: Bearer ...)" });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());



        req.user = decoded;
        next();
    } catch (err) {
        console.error("Błąd weryfikacji JWT:", err.message);
        return res.status(401).json({ error: "Nieprawidłowy lub wygasły token" });
    }
}

module.exports = {
    authRequired,
};
