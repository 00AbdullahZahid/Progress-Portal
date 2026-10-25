import test from "node:test";
import assert from "node:assert/strict";
import { currentStreak, dateInTz, lastNDays, shiftDate, todayStr } from "./dates";

test("currentStreak counts consecutive days ending today", () => {
  const dates = new Set(["2026-10-25", "2026-10-24", "2026-10-23"]);
  assert.equal(currentStreak(dates, "2026-10-25"), 3);
});

test("currentStreak forgives a missing today but not a missing yesterday", () => {
  assert.equal(currentStreak(new Set(["2026-10-24", "2026-10-23"]), "2026-10-25"), 2);
  assert.equal(currentStreak(new Set(["2026-10-23"]), "2026-10-25"), 0);
});

test("shiftDate crosses month and leap-year boundaries", () => {
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDate("2028-03-01", -1), "2028-02-29");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
});

test("dateInTz buckets a UTC timestamp into the viewer's day", () => {
  const lateUtc = new Date("2026-10-25T20:30:00Z");
  assert.equal(dateInTz(lateUtc, "UTC"), "2026-10-25");
  assert.equal(dateInTz(lateUtc, "Asia/Karachi"), "2026-10-26");
});

test("lastNDays returns the requested window ending today", () => {
  const days = lastNDays("Asia/Karachi", 7);
  assert.equal(days.length, 7);
  assert.equal(days[6], todayStr("Asia/Karachi"));
  assert.equal(days[0] < days[6], true);
});
