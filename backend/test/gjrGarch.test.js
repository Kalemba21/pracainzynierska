const test = require("node:test");
const assert = require("node:assert/strict");

const { simulateNextPriceGjr } = require("../src/utils/gjrGarch");

console.log("\n[backend] gjrGarch.test.js: start");

function withMockedRandom(sequence, fn) {
  const orig = Math.random;
  let i = 0;
  Math.random = () => {
    const v = sequence[i % sequence.length];
    i += 1;

    return v === 0 ? 0.000001 : v;
  };
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}

test("simulateNextPriceGjr: zwraca null dla zlych danych", () => {
  assert.equal(simulateNextPriceGjr([], 100), null);
  assert.equal(simulateNextPriceGjr([1, 2, 3], 100), null); // za malo close
  assert.equal(simulateNextPriceGjr(new Array(30).fill(1), 0), null);
  assert.equal(simulateNextPriceGjr(new Array(30).fill(1), "abc"), null);
});

test("simulateNextPriceGjr: generuje cene i debug, a driftBias zalezy od mode", () => {

  const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
  const price = 130;

  const resPos = withMockedRandom([0.42, 0.84], () => simulateNextPriceGjr(closes, price, "positive"));
  const resNeg = withMockedRandom([0.42, 0.84], () => simulateNextPriceGjr(closes, price, "negative"));
  const resNeu = withMockedRandom([0.42, 0.84], () => simulateNextPriceGjr(closes, price, "neutral"));

  console.log("[backend][gjrGarch] pos nextPrice=", resPos?.nextPrice, "driftBias=", resPos?.debug?.driftBias);
  console.log("[backend][gjrGarch] neg nextPrice=", resNeg?.nextPrice, "driftBias=", resNeg?.debug?.driftBias);
  console.log("[backend][gjrGarch] neu nextPrice=", resNeu?.nextPrice, "driftBias=", resNeu?.debug?.driftBias);

  console.log(
    "[backend] GJR-GARCH sample:",
    {
      pos: { nextPrice: resPos?.nextPrice, driftBias: resPos?.debug?.driftBias },
      neg: { nextPrice: resNeg?.nextPrice, driftBias: resNeg?.debug?.driftBias },
      neu: { nextPrice: resNeu?.nextPrice, driftBias: resNeu?.debug?.driftBias },
    }
  );

  assert.ok(resPos && typeof resPos === "object");
  assert.ok(Number.isFinite(resPos.nextPrice));
  assert.ok(resPos.nextPrice > 0);
  assert.equal(resPos.debug.mode, "positive");

  assert.ok(resNeg && typeof resNeg === "object");
  assert.ok(Number.isFinite(resNeg.nextPrice));
  assert.ok(resNeg.nextPrice > 0);
  assert.equal(resNeg.debug.mode, "negative");

  assert.ok(resNeu && typeof resNeu === "object");
  assert.equal(resNeu.debug.mode, "neutral");

  assert.ok(resPos.debug.driftBias > 0);
  assert.ok(resNeg.debug.driftBias < 0);
  assert.equal(resNeu.debug.driftBias, 0);

  assert.ok(resPos.debug.stationaryFactor > 0);
  assert.ok(resPos.debug.stationaryFactor < 1);
});

test("simulateNextPriceGjr: sanitizuje close z stringow i obiektow (przez API)", () => {
  const closes = [
    { Close: "100,0" },
    { close: "101.0" },
    { price: 102 },
    "103,5",
    104,
    "bad",
    null,
    -5,
  ];

  while (closes.length < 25) closes.push(100 + closes.length);

  const res = withMockedRandom([0.33, 0.77], () => simulateNextPriceGjr(closes, "105"));
  console.log("[backend] sanitize sample nextPrice:", res?.nextPrice);
  assert.ok(res);
  assert.ok(Number.isFinite(res.nextPrice));
  assert.ok(res.nextPrice > 0);
});
