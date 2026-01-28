const express = require("express");
const cors = require("cors");

const db = require("./db");
const gameRoutes = require("./routes/gameRoutes");
const finnhubRouter = require("./routes/finnhub");
const stooqRouter = require("./routes/stooq");
const portfolioRoutes = require("./routes/portfolioRoutes");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
const { ensureDefaultAdmin } = require("./ensureAdmin");

const { BOOT_ID } = require("./jwtSession");


function createApp() {
  const app = express();

  const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Stock-sim backend dziala" });
  });

  app.get("/api/boot-id", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json({ ok: true, bootId: BOOT_ID });
  });

  app.get("/api/db-health", async (req, res) => {
    try {
      await db.ready;
      const result = await db.query("SELECT NOW() AS now");
      res.json({
        ok: true,
        now: result.rows[0].now,
        activeDb: typeof db.getActive === "function" ? db.getActive() : undefined,
      });
    } catch (err) {
      console.error("Blad /api/db-health:", err);
      res.status(500).json({
        ok: false,
        error: "Blad polaczenia z baza",
        details: err.message,
        code: err.code,
      });
    }
  });

  app.use(async (req, res, next) => {
    if (req.path === "/" || req.path === "/api/db-health" || req.path === "/api/boot-id") return next();

    try {
      await db.ready;
      return next();
    } catch (e) {
      console.error("[DB NOT READY]", e.message);
      return res.status(503).json({
        ok: false,
        error: "Baza danych niedostepna (DB not ready)",
        details: e.message,
      });
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api", finnhubRouter);
  app.use("/api/stooq", stooqRouter);
  app.use("/api/portfolio", portfolioRoutes);
  app.use("/api/game", gameRoutes);

  db.ready
    .then(() => ensureDefaultAdmin())
    .catch((e) => console.error("[ensureDefaultAdmin] DB not ready:", e.message));

  app.use("/api", (req, res) => {
    res.status(404).json({
      ok: false,
      error: "Nie znaleziono endpointu API",
      path: req.originalUrl,
    });
  });

  app.use((err, req, res, next) => {
    console.error("[API ERROR]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  });

  return app;
}

module.exports = { createApp };
