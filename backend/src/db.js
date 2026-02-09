const { Pool } = require("pg");

const remoteUrl = process.env.DATABASE_URL;
const localUrl = process.env.LOCAL_DATABASE_URL;
const DB_MODE = String(process.env.DB_MODE || (remoteUrl ? "remote" : "local")).toLowerCase();

if (!remoteUrl) console.warn("[db] Brak DATABASE_URL (REMOTE).");
if (!localUrl) console.warn("[db] Brak LOCAL_DATABASE_URL (LOCAL).");

function makePool(url, opts = {}) {
    if (!url) return null;

    const cfg = { connectionString: url };
    if (opts.ssl) cfg.ssl = opts.ssl;

    return new Pool(cfg);
}
const remotePool = makePool(remoteUrl, {
    ssl: { rejectUnauthorized: false },
});
const localPool = makePool(localUrl, {
    ssl: false,
});
let activePool = null;
let activeName = "NONE";
async function testPool(pool, name) {
    if (!pool) return false;
    try {
        const res = await pool.query("SELECT NOW() AS now");
        console.log(`[db] OK ${name}, czas:`, res.rows[0].now);
        return true;
    } catch (e) {
        console.error(`[db] FAIL ${name}:`, e.message);
        return false;
    }
}
const ready = (async () => {
    if (DB_MODE === "local") {
        const ok = await testPool(localPool, "LOCAL");
        if (!ok) throw new Error("[db] DB_MODE=local, ale LOCAL nie dziala.");
        activePool = localPool;
        activeName = "LOCAL";
        console.log("[db] Aktywna baza: LOCAL");
        return;
    }

    if (DB_MODE === "remote") {
        const ok = await testPool(remotePool, "REMOTE");
        if (!ok) throw new Error("[db] DB_MODE=remote, ale REMOTE nie dziala.");
        activePool = remotePool;
        activeName = "REMOTE";
        console.log("[db] Aktywna baza: REMOTE");
        return;
    }
    const remoteOk = await testPool(remotePool, "REMOTE");
    if (remoteOk) {
        activePool = remotePool;
        activeName = "REMOTE";
        console.log("[db] Aktywna baza: REMOTE (auto)");
        return;
    }

    const localOk = await testPool(localPool, "LOCAL");
    if (localOk) {
        activePool = localPool;
        activeName = "LOCAL";
        console.warn("[db] Przelaczono na LOCAL (fallback).");
        return;
    }

    throw new Error("[db] Nie udalo sie polaczyc ani z REMOTE ani z LOCAL.");
})();
function isConnectionError(err) {
    const msg = String(err?.message || "").toLowerCase();
    const code = String(err?.code || "").toUpperCase();
    return (
        code === "ECONNREFUSED" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "ENOTFOUND" ||
        msg.includes("econnrefused") ||
        msg.includes("timeout") ||
        msg.includes("econnreset") ||
        msg.includes("getaddrinfo") ||
        msg.includes("enotfound") ||
        msg.includes("network") ||
        msg.includes("connect")
    );
}
async function query(text, params) {
    await ready;

    try {
        return await activePool.query(text, params);
    } catch (err) {
        if (DB_MODE === "auto" && activeName === "REMOTE" && localPool && isConnectionError(err)) {
            console.warn("[db] REMOTE padlo, przelaczam na LOCAL i ponawiam query...");
            activePool = localPool;
            activeName = "LOCAL";
            return await activePool.query(text, params);
        }
        throw err;
    }
}

module.exports = {
    query,
    ready,
    remotePool,
    localPool,
    getActive: () => ({ name: activeName, mode: DB_MODE }),
};
