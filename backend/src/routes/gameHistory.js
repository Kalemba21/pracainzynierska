const express = require("express");
const router = express.Router();

const db = require("../db");
const { authRequired } = require("../middleware/authMiddleware");

router.post("/history", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, error: "Brak usera" });

        const {
            status,
            days,
            total,
            pnl,
            pnlPct,
            tradesCount,
            panicSellCount,
            difficultyId,
            simMode,
            initialCapital,
            target,
            trades,
            eventHistory,
            dayLog,
            priceHistory, // ✅ DODANE
        } = req.body || {};

        const safeStatus = String(status || "").toLowerCase();
        if (!["won", "lost", "abandoned"].includes(safeStatus)) {
            return res.status(400).json({ ok: false, error: "Nieprawidłowy status gry" });
        }

        const safePriceHistory =
            priceHistory && typeof priceHistory === "object" && !Array.isArray(priceHistory)
                ? priceHistory
                : {};

        const payload = {
            target: target ?? null,
            initialCapital: initialCapital ?? null,
            difficultyId: difficultyId ?? null,
            simMode: simMode ?? null,
            trades: Array.isArray(trades) ? trades : [],
            eventHistory: Array.isArray(eventHistory) ? eventHistory : [],
            dayLog: Array.isArray(dayLog) ? dayLog : [],
            priceHistory: safePriceHistory, // ✅ DODANE
        };

        const q = `
            INSERT INTO game_history
            (user_id, status, days_played, initial_capital, final_value, pnl, pnl_pct,
             trades_count, panic_sell_count, difficulty_id, sim_mode, payload)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11, $12)
                RETURNING id, created_at
        `;

        const params = [
            userId,
            safeStatus,
            Number.isFinite(Number(days)) ? Number(days) : null,
            Number.isFinite(Number(initialCapital)) ? Number(initialCapital) : null,
            Number.isFinite(Number(total)) ? Number(total) : null,
            Number.isFinite(Number(pnl)) ? Number(pnl) : null,
            Number.isFinite(Number(pnlPct)) ? Number(pnlPct) : null,
            Number.isFinite(Number(tradesCount)) ? Number(tradesCount) : 0,
            Number.isFinite(Number(panicSellCount)) ? Number(panicSellCount) : 0,
            difficultyId ?? null,
            simMode ?? null,
            payload,
        ];

        const result = await db.query(q, params);

        res.json({
            ok: true,
            id: result.rows[0].id,
            created_at: result.rows[0].created_at,
        });
    } catch (err) {
        console.error("[GAME HISTORY] POST /api/game/history error:", err);
        res.status(500).json({ ok: false, error: "Server error", details: err.message });
    }
});

router.get("/history", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, error: "Brak usera" });

        const limit = Math.min(parseInt(req.query.limit || "10", 10) || 10, 50);

        const q = `
            SELECT
                id, created_at, status,
                days_played, initial_capital, final_value,
                pnl, pnl_pct,
                trades_count, panic_sell_count,
                difficulty_id, sim_mode
            FROM game_history
            WHERE user_id = $1
            ORDER BY created_at DESC
                LIMIT $2
        `;

        const result = await db.query(q, [userId, limit]);
        res.json({ ok: true, items: result.rows });
    } catch (err) {
        console.error("[GAME HISTORY] GET /api/game/history error:", err);
        res.status(500).json({ ok: false, error: "Server error", details: err.message });
    }
});

router.get("/history/:id", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ ok: false, error: "Brak usera" });

        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ ok: false, error: "Nieprawidłowe ID" });

        const q = `
            SELECT
                id, created_at, status,
                days_played, initial_capital, final_value,
                pnl, pnl_pct,
                trades_count, panic_sell_count,
                difficulty_id, sim_mode,
                payload
            FROM game_history
            WHERE id = $1 AND user_id = $2
                LIMIT 1
        `;

        const result = await db.query(q, [id, userId]);
        if (!result.rows.length) {
            return res.status(404).json({ ok: false, error: "Nie znaleziono gry" });
        }

        res.json({ ok: true, item: result.rows[0] });
    } catch (err) {
        console.error("[GAME HISTORY] GET /api/game/history/:id error:", err);
        res.status(500).json({ ok: false, error: "Server error", details: err.message });
    }
});

module.exports = router;
