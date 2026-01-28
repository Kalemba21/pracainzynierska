const test = require("node:test");
const assert = require("node:assert/strict");

const { BOOT_ID, getJwtSecret } = require("../src/jwtSession");

console.log("\n[backend] jwtSession.test.js: start (BOOT_ID=" + BOOT_ID + ")");

test("jwtSession: BOOT_ID ma format hex i dlugosc 32", () => {
  assert.match(BOOT_ID, /^[0-9a-f]{32}$/);
});

test("jwtSession: getJwtSecret rzuca blad gdy brak JWT_SECRET", () => {
  const prev = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;

  assert.throws(() => getJwtSecret(), /Brak JWT_SECRET/);
  console.log("[backend][jwt] missing JWT_SECRET -> throws OK");

  if (prev !== undefined) process.env.JWT_SECRET = prev;
});

test("jwtSession: getJwtSecret zwraca sekret z env", () => {
  const prev = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "super-secret";

  assert.equal(getJwtSecret(), "super-secret");
  console.log("[backend][jwt] JWT_SECRET resolved OK");

  if (prev !== undefined) process.env.JWT_SECRET = prev;
  else delete process.env.JWT_SECRET;
});
