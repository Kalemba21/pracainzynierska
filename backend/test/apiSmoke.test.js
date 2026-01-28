const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/app");

console.log("\n[backend] apiSmoke.test.js: start");

async function fetchJson(url) {
  const res = await fetch(url);
  const json = await res.json();
  return { status: res.status, json };
}

test("API smoke: GET / dziala bez DB", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    console.log(`[backend][api] server started on :${port}`);
    const { status, json } = await fetchJson(`http://127.0.0.1:${port}/`);
    console.log("[backend][api] GET / ->", status, json);
    assert.equal(status, 200);
    assert.equal(json.status, "ok");
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("API smoke: GET /api/boot-id zwraca bootId", async () => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const port = server.address().port;
    console.log(`[backend][api] server started on :${port}`);
    const { status, json } = await fetchJson(`http://127.0.0.1:${port}/api/boot-id`);
    console.log("[backend][api] GET /api/boot-id ->", status, json);
    assert.equal(status, 200);
    assert.equal(json.ok, true);
    assert.match(json.bootId, /^[0-9a-f]{32}$/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
