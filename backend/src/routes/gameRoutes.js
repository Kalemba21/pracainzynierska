const express = require("express");
const router = express.Router();

const db = require("../db");
const { authRequired } = require("../middleware/authMiddleware");
const { simulateNextPriceGjr } = require("../utils/gjrGarch");
router.post("/next-price-gjr", async (req, res) => {
    try {
        const { symbol, currentPrice, mode } = req.body || {};
        const sym = String(symbol || "").trim().toLowerCase();
        const priceNum = Number(currentPrice);

        if (!sym || !Number.isFinite(priceNum) || priceNum <= 0) {
            return res.status(400).json({
                ok: false,
                error: "Nieprawidłowe dane wejściowe",
            });
        }
        const closes = []; // <= PODMIEŃ jeśli masz

        const model = simulateNextPriceGjr(closes, priceNum, mode);
        let nextPrice = model?.nextPrice ?? null;
        if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
            const drift = (Math.random() - 0.5) * 0.02;
            nextPrice = priceNum * (1 + drift);
        }

        return res.json({
            ok: true,
            symbol: sym,
            nextPrice,
        });
    } catch (err) {
        console.error("[GJR] error:", err);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});
router.post("/history", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) {
            return res.status(400).json({
                ok: false,
                error: "Brak userId w tokenie (req.user.id).",
            });
        }

        const body = req.body || {};
        const status = String(body.status || "").trim(); // won/lost/abandoned
        const days = Number(body.days ?? body.days_played ?? 0);
        const total = Number(body.total ?? body.final_value ?? 0);
        const pnl = body.pnl == null ? null : Number(body.pnl);
        const pnlPct = body.pnlPct == null && body.pnl_pct == null ? null : Number(body.pnlPct ?? body.pnl_pct);

        const tradesCount = Number(body.tradesCount ?? body.trades_count ?? 0);
        const panicSellCount = Number(body.panicSellCount ?? body.panic_sell_count ?? 0);

        const difficultyId = body.difficultyId ?? body.difficulty_id ?? null;
        const simMode = body.simMode ?? body.sim_mode ?? null;

        const initialCapital =
            body.initialCapital == null && body.initial_capital == null
                ? null
                : Number(body.initialCapital ?? body.initial_capital);
        const payload = body;

        if (!status) {
            return res.status(400).json({ ok: false, error: "Brak status" });
        }
        const q = `
      INSERT INTO game_history
        (app_user_id, status, days_played, initial_capital, final_value, pnl, pnl_pct,
         trades_count, panic_sell_count, difficulty_id, sim_mode, payload)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, app_user_id, status, days_played, initial_capital, final_value, pnl, pnl_pct,
                trades_count, panic_sell_count, difficulty_id, sim_mode, created_at
    `;

        const params = [
            userId,
            status,
            Number.isFinite(days) ? days : 0,
            Number.isFinite(initialCapital) ? initialCapital : null,
            Number.isFinite(total) ? total : null,
            Number.isFinite(pnl) ? pnl : null,
            Number.isFinite(pnlPct) ? pnlPct : null,
            Number.isFinite(tradesCount) ? tradesCount : 0,
            Number.isFinite(panicSellCount) ? panicSellCount : 0,
            difficultyId,
            simMode,
            payload,
        ];

        const ins = await db.query(q, params);

        return res.json({ ok: true, item: ins.rows[0] });
    } catch (err) {
        console.error("[GAME HISTORY] insert error:", err);
        return res.status(500).json({
            ok: false,
            error: "Nie udało się zapisać historii gry",
            details: err.message,
            code: err.code,
        });
    }
});
router.get("/history", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        if (!userId) {
            return res.status(400).json({
                ok: false,
                error: "Brak userId w tokenie (req.user.id).",
            });
        }

        const q = `
      SELECT id, app_user_id, status, days_played, initial_capital, final_value, pnl, pnl_pct,
             trades_count, panic_sell_count, difficulty_id, sim_mode, created_at
      FROM game_history
      WHERE app_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;

        const r = await db.query(q, [userId]);
        return res.json({ ok: true, items: r.rows });
    } catch (err) {
        console.error("[GAME HISTORY] list error:", err);
        return res.status(500).json({
            ok: false,
            error: "Nie udało się pobrać historii gier",
            details: err.message,
            code: err.code,
        });
    }
});
router.get("/history/:id", authRequired, async (req, res) => {
    try {
        await db.ready;

        const userId = req.user?.id;
        const id = req.params.id;

        const q = `
            SELECT *
            FROM game_history
            WHERE id = $1 AND app_user_id = $2
                LIMIT 1
        `;

        const r = await db.query(q, [id, userId]);
        const row = r.rows[0];
        if (!row) {
            return res.status(404).json({ ok: false, error: "Nie znaleziono gry" });
        }

        return res.json({ ok: true, item: row });
    } catch (err) {
        console.error("[GAME HISTORY] details error:", err);
        return res.status(500).json({
            ok: false,
            error: "Nie udało się pobrać szczegółów gry",
            details: err.message,
            code: err.code,
        });
    }
});

module.exports = router;
