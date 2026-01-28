const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const STQ_BASE_CSV_URL = "https://stooq.com/q/d/l/";
const CACHE_FILE = path.join(__dirname, "..", "stooq-cache.json");
const stooqHistoryCache = new Map();
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}
function loadCacheFromDisk() {
    try {
        if (!fs.existsSync(CACHE_FILE)) {
            console.log("[stooq-cache] brak pliku – startujemy od pustego cache'a");
            return;
        }
        const raw = fs.readFileSync(CACHE_FILE, "utf8");
        const data = JSON.parse(raw);

        Object.entries(data).forEach(([symbol, entry]) => {
            if (entry && Array.isArray(entry.rows) && entry.dateKey) {
                stooqHistoryCache.set(symbol, entry);
            }
        });

        console.log(
            `[stooq-cache] wczytano cache z dysku (${stooqHistoryCache.size} symboli)`
        );
    } catch (err) {
        console.error("[stooq-cache] błąd przy wczytywaniu:", err.message);
    }
}
function saveCacheToDisk() {
    try {
        const obj = {};
        for (const [symbol, entry] of stooqHistoryCache.entries()) {
            obj[symbol] = entry;
        }
        fs.writeFile(
            CACHE_FILE,
            JSON.stringify(obj, null, 2),
            (err) => {
                if (err) {
                    console.error("[stooq-cache] błąd zapisu:", err.message);
                }
            }
        );
    } catch (err) {
        console.error("[stooq-cache] błąd przy przygotowaniu zapisu:", err.message);
    }
}
loadCacheFromDisk();

async function fetchStooqHistory(symbol) {
    const symKey = String(symbol).toLowerCase();
    const today = todayKey();

    const cached = stooqHistoryCache.get(symKey);
    if (cached && cached.dateKey === today && Array.isArray(cached.rows)) {
        console.log("[stooq] CACHE HIT (persist) dla", symKey);
        return { rows: cached.rows, fromCache: true };
    }

    console.log("[stooq] CACHE MISS (pobieram z Stooq) dla", symKey);

    const url = `${STQ_BASE_CSV_URL}?s=${encodeURIComponent(symKey)}&i=d`;

    const response = await axios.get(url, {
        responseType: "text",
        headers: {
            "User-Agent": "Mozilla/5.0 (Stock-Sim/1.0)",
        },
    });

    const csv = String(response.data || "").trim();
    if (!csv) {
        console.warn("[stooq] pusty CSV dla", symKey);
        return { rows: [], fromCache: false };
    }

    const lines = csv.split(/\r?\n/);
    if (lines.length <= 1) {
        console.warn("[stooq] tylko nagłówek CSV dla", symKey);
        return { rows: [], fromCache: false };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
        const cols = line.split(",");
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = cols[i];
        });
        return obj;
    });
    stooqHistoryCache.set(symKey, {
        rows,
        dateKey: today,
        fetchedAt: Date.now(),
    });
    saveCacheToDisk();

    return { rows, fromCache: false };
}
router.get("/history", async (req, res) => {
    const { symbol } = req.query;
    if (!symbol) {
        return res.status(400).json({ error: "Brak parametru symbol" });
    }

    try {
        const { rows, fromCache } = await fetchStooqHistory(symbol);
        res.set("X-Stooq-Cache", fromCache ? "HIT" : "MISS");

        res.json(rows);
    } catch (err) {
        console.error("Błąd /api/stooq/history:", err.message);
        res.status(500).json({
            error: `Nie udało się pobrać danych ze Stooq dla symbolu ${symbol}`,
        });
    }
});
router.get("/wig20", async (req, res) => {
    try {
        const { rows, fromCache } = await fetchStooqHistory("wig20");
        res.set("X-Stooq-Cache", fromCache ? "HIT" : "MISS");
        res.json(rows);
    } catch (err) {
        console.error("Błąd /api/stooq/wig20:", err.message);
        res.status(500).json({
            error: "Nie udało się pobrać WIG20 ze Stooq",
        });
    }
});

module.exports = router;
