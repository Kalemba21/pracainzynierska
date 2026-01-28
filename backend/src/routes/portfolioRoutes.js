const express = require("express");
const router = express.Router();

const db = require("../db");
const { authRequired } = require("../middleware/authMiddleware");
router.get("/", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Brak usera w tokenie" });

        const result = await db.query(
            `
                SELECT
                    id, user_id, name, currency, symbol,
                    quantity, avg_price,
                    created_at, updated_at
                FROM portfolio
                WHERE user_id = $1
                ORDER BY updated_at DESC, created_at DESC
            `,
            [userId]
        );

        res.json({ portfolio: result.rows });
    } catch (err) {
        console.error("Błąd GET /api/portfolio:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});
router.post("/", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Brak usera w tokenie" });

        const symbol = String(req.body?.symbol || "").trim().toUpperCase();
        const quantity = Number(req.body?.quantity);
        const avgPrice = Number(req.body?.avg_price);

        if (!symbol) return res.status(400).json({ error: "Brak symbol" });
        if (!Number.isFinite(quantity) || quantity < 0)
            return res.status(400).json({ error: "Niepoprawne quantity" });
        if (!Number.isFinite(avgPrice) || avgPrice < 0)
            return res.status(400).json({ error: "Niepoprawne avg_price" });
        const result = await db.query(
            `
                INSERT INTO portfolio (user_id, name, currency, symbol, quantity, avg_price)
                VALUES ($1, 'Domyślny portfel', 'PLN', $2, $3, $4)
                    ON CONFLICT (user_id, symbol)
        DO UPDATE SET
                    quantity = EXCLUDED.quantity,
                                   avg_price = EXCLUDED.avg_price,
                                   updated_at = NOW()
                                   RETURNING
                                   id, user_id, name, currency, symbol,
                                   quantity, avg_price,
                                   created_at, updated_at
            `,
            [userId, symbol, quantity, avgPrice]
        );

        res.json({ ok: true, row: result.rows[0] });
    } catch (err) {
        console.error("Błąd POST /api/portfolio:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});
router.delete("/:symbol", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Brak usera w tokenie" });

        const symbol = String(req.params.symbol || "").trim().toUpperCase();
        if (!symbol) return res.status(400).json({ error: "Brak symbol w URL" });

        const result = await db.query(
            `
                DELETE FROM portfolio
                WHERE user_id = $1 AND symbol = $2
                    RETURNING id
            `,
            [userId, symbol]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Nie znaleziono pozycji do usunięcia" });
        }

        res.json({ ok: true, deletedId: result.rows[0].id });
    } catch (err) {
        console.error("Błąd DELETE /api/portfolio/:symbol:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

module.exports = router;
