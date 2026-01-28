const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

console.log("\n[frontend] uiStatic.test.js: start");

function read(rel) {
  const p = path.join(__dirname, "..", rel);
  const content = fs.readFileSync(p, "utf8");
  console.log("[frontend][ui] read:", rel, "(" + content.length + " chars)");
  return content;
}

test("UI (static): App ma login jako domyslny widok i nazwe aplikacji", () => {
  const s = read("src/App.jsx");

  assert.ok(s.includes("SimOfStock"));
  assert.ok(s.includes("Zaloguj się"));

  assert.ok(s.includes("useEffect(() => {\n        setViewMode(\"login\")"));
  console.log("[frontend][ui] App.jsx patterns OK");
});

test("UI (static): AuthPanel zawiera walidacje i etykiety pol", () => {
  const s = read("src/components/AuthPanel.jsx");
  assert.ok(s.includes("function isValidEmail"));
  assert.ok(s.includes("Email"));
  assert.ok(s.includes("Haslo"));

  assert.ok(s.includes("pass.length < 6"));

  assert.ok(s.includes("useState(\"login\")"));
  assert.ok(s.includes("switchMode(\"login\")"));
  assert.ok(s.includes("switchMode(\"register\")"));
  console.log("[frontend][ui] AuthPanel.jsx patterns OK");
});

test("UI (static): QuoteCard ma placeholder Brak danych oraz obsluge fallback Stooq", () => {
  const s = read("src/components/QuoteCard.jsx");
  assert.ok(s.includes("Brak danych"));
  assert.ok(s.includes("fallback"));
  assert.ok(s.includes("Stooq"));
  console.log("[frontend][ui] QuoteCard.jsx patterns OK");
});

test("UI (static): SymbolSearch ma szybkie wybory i zawiera AAPL", () => {
  const s = read("src/components/SymbolSearch.jsx");
  assert.ok(s.includes("POPULAR_FINNHUB"));
  assert.ok(s.includes("AAPL"));
  assert.ok(s.includes("Popularne spółki"));
  console.log("[frontend][ui] SymbolSearch.jsx patterns OK");
});
