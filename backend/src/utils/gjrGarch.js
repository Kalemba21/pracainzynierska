function gaussianRandom() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function toNumber(x) {
    if (x == null) return null;
    if (typeof x === "number") return Number.isFinite(x) ? x : null;

    if (typeof x === "string") {
        const s = x.trim().replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : null;
    }
    if (typeof x === "object") {
        const cand =
            x.Close ?? x.close ?? x.CLOSE ?? x.c ?? x.price ?? x.value ?? null;
        return toNumber(cand);
    }

    return null;
}

function sanitizeCloses(closes) {
    if (!Array.isArray(closes)) return [];

    const out = [];
    for (const it of closes) {
        const n = toNumber(it);
        if (Number.isFinite(n) && n > 0) out.push(n);
    }
    return out;
}

function computeLogReturns(closesNumeric) {
    const returns = [];
    for (let i = 1; i < closesNumeric.length; i += 1) {
        const pPrev = closesNumeric[i - 1];
        const pCurr = closesNumeric[i];

        if (Number.isFinite(pPrev) && Number.isFinite(pCurr) && pPrev > 0 && pCurr > 0) {
            const r = Math.log(pCurr / pPrev);
            if (Number.isFinite(r)) returns.push(r);
        }
    }
    return returns;
}

function normalizeMode(mode) {
    if (!mode) return "neutral";
    const m = String(mode).toLowerCase();

    if (["pos", "positive", "bull", "byczy"].includes(m)) return "positive";
    if (["neg", "negative", "bear", "niedzwiedzi"].includes(m)) return "negative";
    return "neutral";
}

function estimateGjrParams(closesNumeric) {
    if (!Array.isArray(closesNumeric) || closesNumeric.length < 20) return null;

    const returns = computeLogReturns(closesNumeric);
    if (!returns || returns.length < 10) return null;

    const n = returns.length;
    const mu = returns.reduce((a, b) => a + b, 0) / n;

    let varAcc = 0;
    for (let i = 0; i < n; i += 1) {
        const d = returns[i] - mu;
        varAcc += d * d;
    }

    const variance = varAcc / Math.max(1, n - 1);
    const alpha = 0.05;
    const gamma = 0.05;
    const beta = 0.90;
    let stationaryFactor = alpha + beta + 0.5 * gamma;
    if (stationaryFactor >= 0.99) stationaryFactor = 0.99;

    let omega = variance * (1 - stationaryFactor);
    if (!Number.isFinite(omega) || omega <= 0) omega = 1e-6;

    const lastReturn = returns[returns.length - 1];
    const eps = lastReturn - mu;

    const h = Math.max(Number.isFinite(variance) ? variance : 0, 1e-8);

    return { mu, alpha, beta, gamma, omega, h, eps };
}

function simulateNextPriceGjr(closes, currentPrice, mode = "neutral") {
    const priceNum = toNumber(currentPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return null;
    const closesNumeric = sanitizeCloses(closes);
    if (closesNumeric.length < 20) return null;

    const params = estimateGjrParams(closesNumeric);
    if (!params) return null;

    const effectiveMode = normalizeMode(mode);
    const { mu, alpha, beta, gamma, omega, h, eps } = params;

    const indicator = eps < 0 ? 1 : 0;

    let newH =
        omega +
        alpha * eps * eps +
        gamma * indicator * eps * eps +
        beta * h;

    if (!Number.isFinite(newH) || newH <= 0) newH = 1e-8;

    const vol = Math.sqrt(newH);

    let driftBias = 0;
    if (effectiveMode === "positive") driftBias = 0.3 * vol;
    else if (effectiveMode === "negative") driftBias = -0.3 * vol;

    const z = gaussianRandom();
    const ret = mu + driftBias + vol * z;

    let nextPrice = priceNum * Math.exp(ret);
    if (!Number.isFinite(nextPrice) || nextPrice <= 0) nextPrice = priceNum;

    return {
        nextPrice,
        debug: {
            mode: effectiveMode,
            mu,
            driftBias,
            alpha,
            beta,
            gamma,
            omega,
            hPrev: h,
            hNext: newH,
            epsPrev: eps,
            ret,
            stationaryFactor: alpha + beta + 0.5 * gamma,
            closesLen: closesNumeric.length,
        },
    };
}

module.exports = {
    simulateNextPriceGjr,
};
