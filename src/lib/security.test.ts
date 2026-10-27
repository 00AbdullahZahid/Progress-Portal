import test from "node:test";
import assert from "node:assert/strict";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  validatePassword,
  verifyPassword,
} from "./security";

test("hashPassword produces a salt:hash pair that verifies", async () => {
  const stored = await hashPassword("correct horse battery staple");
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);

  assert.equal(await verifyPassword("correct horse battery staple", stored), true);
  assert.equal(await verifyPassword("wrong password", stored), false);
});

test("verifyPassword rejects malformed stored values", async () => {
  assert.equal(await verifyPassword("anything", ""), false);
  assert.equal(await verifyPassword("anything", "no-colon"), false);
  assert.equal(await verifyPassword("anything", "salt:"), false);
});

test("the dummy login hash is a valid scrypt hash that never matches", async () => {
  assert.match(DUMMY_PASSWORD_HASH, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(await verifyPassword("", DUMMY_PASSWORD_HASH), false);
  assert.equal(await verifyPassword("anything", DUMMY_PASSWORD_HASH), false);
});

test("validatePassword enforces the length bounds", () => {
  assert.match(validatePassword("short") ?? "", /at least 8/);
  assert.equal(validatePassword("longenough"), null);
  assert.match(validatePassword("x".repeat(201)) ?? "", /at most 200/);
});
