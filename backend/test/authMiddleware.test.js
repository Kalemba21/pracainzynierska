const test = require("node:test");
const assert = require("node:assert/strict");

const jwt = require("jsonwebtoken");
const { authRequired } = require("../src/middleware/authMiddleware");

console.log("\n[backend] authMiddleware.test.js: start");

function makeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("authRequired: 401 gdy brak Authorization", () => {
  const prev = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  const req = { headers: {} };
  const res = makeRes();
  let nextCalled = false;
  authRequired(req, res, () => {
    nextCalled = true;
  });

  console.log("[backend][auth] missing auth ->", res.statusCode, res.body);

  assert.equal(res.statusCode, 401);
  assert.ok(res.body && res.body.error);
  assert.equal(nextCalled, false);

  if (prev !== undefined) process.env.JWT_SECRET = prev;
  else delete process.env.JWT_SECRET;
});

test("authRequired: 401 dla niepoprawnego tokenu", () => {
  const prev = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  const req = { headers: { authorization: "Bearer not-a-real-token" } };
  const res = makeRes();
  let nextCalled = false;
  authRequired(req, res, () => {
    nextCalled = true;
  });

  console.log("[backend][auth] invalid token ->", res.statusCode, res.body);

  assert.equal(res.statusCode, 401);
  assert.ok(res.body && res.body.error);
  assert.equal(nextCalled, false);

  if (prev !== undefined) process.env.JWT_SECRET = prev;
  else delete process.env.JWT_SECRET;
});

test("authRequired: przepuszcza i ustawia req.user dla poprawnego JWT", () => {
  const prev = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-secret";

  const token = jwt.sign({ id: 123, email: "a@b.pl", isAdmin: false }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = makeRes();
  let nextCalled = false;
  authRequired(req, res, () => {
    nextCalled = true;
  });

  console.log("[backend][auth] valid token ->", { statusCode: res.statusCode, user: req.user });

  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
  assert.ok(req.user);
  assert.equal(req.user.email, "a@b.pl");

  if (prev !== undefined) process.env.JWT_SECRET = prev;
  else delete process.env.JWT_SECRET;
});
