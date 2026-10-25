import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanText,
  isBlobUrl,
  isHexColor,
  isValidDateString,
  isValidTimezone,
  validateLogDate,
} from "./validation";

test("isBlobUrl accepts only https Vercel Blob hosts", () => {
  assert.equal(
    isBlobUrl("https://store.public.blob.vercel-storage.com/notes/a.png"),
    true
  );
  assert.equal(isBlobUrl("http://store.public.blob.vercel-storage.com/a.png"), false);
  assert.equal(isBlobUrl("https://example.com/a.png"), false);
  assert.equal(
    isBlobUrl("https://store.public.blob.vercel-storage.com.evil.com/a.png"),
    false
  );
  assert.equal(isBlobUrl("not a url"), false);
});

test("isHexColor requires a six-digit hex colour", () => {
  assert.equal(isHexColor("#2563eb"), true);
  assert.equal(isHexColor("#ABCDEF"), true);
  assert.equal(isHexColor("#abc"), false);
  assert.equal(isHexColor("2563eb"), false);
});

test("isValidTimezone follows the runtime's Intl support", () => {
  assert.equal(isValidTimezone("Asia/Karachi"), true);
  assert.equal(isValidTimezone("UTC"), true);
  assert.equal(isValidTimezone("Not/AZone"), false);
  assert.equal(isValidTimezone(""), false);
});

test("isValidDateString rejects rolled-over dates", () => {
  assert.equal(isValidDateString("2026-10-25"), true);
  assert.equal(isValidDateString("2026-02-31"), false);
  assert.equal(isValidDateString("25-10-2026"), false);
});

test("validateLogDate blocks future and over-old dates", () => {
  const today = "2026-10-25";
  assert.deepEqual(validateLogDate(today, today), { ok: true, date: today });
  assert.equal(validateLogDate("2026-10-26", today).ok, false);
  assert.equal(validateLogDate("2025-10-24", today).ok, false);
  assert.equal(validateLogDate("2025-10-25", today).ok, true);
});

test("cleanText trims, bounds and respects optional fields", () => {
  assert.deepEqual(cleanText("  hello  ", 10), { ok: true, value: "hello" });
  assert.equal(cleanText("x".repeat(11), 10).ok, false);
  assert.deepEqual(cleanText(null, 10, { required: false }), {
    ok: true,
    value: "",
  });
  assert.equal(cleanText("", 10).ok, false);
});
