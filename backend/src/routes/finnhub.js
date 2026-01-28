const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const STQ_BASE_CSV_URL = "https://stooq.com/q/d/l/";
const CACHE_DIR = path.join(__dirname, "..", "cache");
const QUOTE_CACHE_FILE = path.join(CACHE_DIR, "finnhub_quote_cache.json");
const SEARCH_CACHE_FILE = path.join(CACHE_DIR, "finnhub_search_cache.json");
const CANDLE_CACHE_FILE = path.join(CACHE_DIR, "finnhub_candle_cache.json");
const STOOQ_FALLBACK_FILE = path.join(CACHE_DIR, "finnhub_stooq_history_cache.json");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function loadJsonCache(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[cache] Nie udało się wczytać ${filePath}:`, e.message);
    return {};
  }
}

function saveJsonCache(filePath, obj) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.warn(`[cache] Nie udało się zapisać ${filePath}:`, e.message);
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
let quoteCache = loadJsonCache(QUOTE_CACHE_FILE);
let searchCache = loadJsonCache(SEARCH_CACHE_FILE);
let candleCache = loadJsonCache(CANDLE_CACHE_FILE);
let stooqHistoryCache = loadJsonCache(STOOQ_FALLBACK_FILE);

function getDailyCacheEntry(cacheObj, key) {
  const entry = cacheObj[key];
  if (!entry) return null;
  if (entry.date !== todayKey()) return null;
  return entry.data;
}

function setDailyCacheEntry(cacheObj, filePath, key, data) {
  cacheObj[key] = { date: todayKey(), data };
  saveJsonCache(filePath, cacheObj);
}
function getApiKey() {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) {
    throw new Error("Brak FINNHUB_API_KEY w .env");
  }
  return key;
}
async function fetchStooqHistory(symbol) {
  const sym = String(symbol).toLowerCase();
  const cacheKey = sym;

  const cached = getDailyCacheEntry(stooqHistoryCache, cacheKey);
  if (cached) {
    console.log(`[finnhub/stooq] CACHE hit historii dla ${sym}`);
    return cached;
  }

  const url = `${STQ_BASE_CSV_URL}?s=${encodeURIComponent(sym)}&i=d`;
  console.log(`[finnhub/stooq] fetch historii z Stooq: ${url}`);

  const response = await axios.get(url, {
    responseType: "text",
    headers: {
      "User-Agent": "Mozilla/5.0 (Stock-Sim/1.0)",
    },
  });

  const csv = response.data;
  const trimmed = String(csv || "").trim();
  if (!trimmed) {
    setDailyCacheEntry(stooqHistoryCache, STOOQ_FALLBACK_FILE, cacheKey, []);
    return [];
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines.length <= 1) {
    setDailyCacheEntry(stooqHistoryCache, STOOQ_FALLBACK_FILE, cacheKey, []);
    return [];
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

  setDailyCacheEntry(stooqHistoryCache, STOOQ_FALLBACK_FILE, cacheKey, rows);
  return rows;
}
function handleFinnhubError(err, res, context) {
  console.error(`Błąd ${context}:`, err.message);

  const status = err.response?.status || 500;

  let message =
      "Nie udało się pobrać danych z Finnhub. Spróbuj ponownie później.";

  if (status === 401 || status === 403) {
    message =
        "Brak dostępu do danych dla tego instrumentu w obecnym planie Finnhub (ograniczenia uprawnień / planu API) również Stooq nie posiadał danych tego instrumentu..";
  } else if (status === 429) {
    message =
        "Przekroczono limit zapytań do Finnhub (rate limit). Spróbuj za chwilę.";
  }

  res.status(status).json({ error: message });
}
router.get("/quote", async (req, res) => {
  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({ error: "Brak parametru symbol" });
  }

  const cacheKey = String(symbol).toUpperCase();
  const cached = getDailyCacheEntry(quoteCache, cacheKey);
  if (cached) {
    console.log(`[finnhub] /quote CACHE hit (disk) dla ${cacheKey}`);
    return res.json({ ...cached, cache: true });
  }

  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: { symbol, token: apiKey },
    });

    const payload = {
      ...response.data,
      source: "finnhub",
      cache: false,
    };

    setDailyCacheEntry(quoteCache, QUOTE_CACHE_FILE, cacheKey, payload);
    return res.json(payload);
  } catch (err) {
    console.warn(
        `Finnhub /quote nie działa dla ${symbol}, próba fallbacku na Stooq...`
    );
    try {
      const rows = await fetchStooqHistory(symbol);
      if (!rows.length) {
        return handleFinnhubError(err, res, "/api/quote (Stooq brak danych)");
      }

      const last = rows[rows.length - 1]; // ostatni dzień notowań

      const stooqQuote = {
        c: last.Close ? Number(last.Close) : null,
        o: last.Open ? Number(last.Open) : null,
        h: last.High ? Number(last.High) : null,
        l: last.Low ? Number(last.Low) : null,
        pc: null, // brak "poprzedniego zamknięcia" wprost
        date: last.Date,
        source: "stooq",
        cache: false,
      };

      setDailyCacheEntry(quoteCache, QUOTE_CACHE_FILE, cacheKey, stooqQuote);
      return res.json(stooqQuote);
    } catch (stooqErr) {
      console.error(
          `Fallback Stooq dla ${symbol} też padł:`,
          stooqErr.message
      );
      return handleFinnhubError(
          err,
          res,
          "/api/quote (Finnhub + fallback Stooq)"
      );
    }
  }
});
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "Brak parametru query" });
  }

  const cacheKey = String(query).toLowerCase();
  const cached = getDailyCacheEntry(searchCache, cacheKey);
  if (cached) {
    console.log(`[finnhub] /search CACHE hit (disk) dla "${cacheKey}"`);
    return res.json({ ...cached, cache: true });
  }

  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${FINNHUB_BASE_URL}/search`, {
      params: { q: query, token: apiKey },
    });

    const payload = { ...response.data, cache: false };
    setDailyCacheEntry(searchCache, SEARCH_CACHE_FILE, cacheKey, payload);
    res.json(payload);
  } catch (err) {
    handleFinnhubError(err, res, "/api/search");
  }
});
router.get("/candle", async (req, res) => {
  const { symbol, resolution = "D", from, to } = req.query;
  if (!symbol || !from || !to) {
    return res
        .status(400)
        .json({ error: "Wymagane parametry: symbol, from, to" });
  }

  const cacheKey = [
    String(symbol).toUpperCase(),
    resolution,
    String(from),
    String(to),
  ].join("|");

  const cached = getDailyCacheEntry(candleCache, cacheKey);
  if (cached) {
    console.log(`[finnhub] /candle CACHE hit (disk) dla ${cacheKey}`);
    return res.json({ ...cached, cache: true });
  }

  try {
    const apiKey = getApiKey();
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
      params: {
        symbol,
        resolution,
        from,
        to,
        token: apiKey,
      },
    });

    const payload = { ...response.data, cache: false };
    setDailyCacheEntry(candleCache, CANDLE_CACHE_FILE, cacheKey, payload);
    res.json(payload);
  } catch (err) {
    handleFinnhubError(err, res, "/api/candle");
  }
});

module.exports = router;
