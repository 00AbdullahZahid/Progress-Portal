import test from "node:test";
import assert from "node:assert/strict";
import { rateLimit, resetRateLimit, sweepRateLimits } from "./rate-limit";

function key(name: string): string {
  return `test:${name}:${Math.random().toString(36).slice(2)}`;
}

test("rateLimit blocks after the limit is reached", () => {
  const bucket = key("block");

  assert.equal(rateLimit(bucket, 2, 60_000).ok, true);
  assert.equal(rateLimit(bucket, 2, 60_000).ok, true);

  const blocked = rateLimit(bucket, 2, 60_000);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds > 0);
});

test("per-IP and per-handle buckets do not share a count", () => {
  const ip = key("ip");
  const handle = key("handle");

  rateLimit(ip, 30, 60_000);
  rateLimit(ip, 30, 60_000);

  // A different key starts fresh even though the IP is already used.
  assert.equal(rateLimit(handle, 10, 60_000).ok, true);
  assert.equal(rateLimit(handle, 10, 60_000).remaining, 8);
});

test("resetRateLimit clears a successful login bucket", () => {
  const bucket = key("reset");
  rateLimit(bucket, 1, 60_000);
  assert.equal(rateLimit(bucket, 1, 60_000).ok, false);

  resetRateLimit(bucket);
  assert.equal(rateLimit(bucket, 1, 60_000).ok, true);
});

test("sweepRateLimits removes only expired buckets", () => {
  const expired = key("sweep-expired");
  const live = key("sweep-live");

  rateLimit(expired, 1, -1);
  rateLimit(live, 1, 60_000);
  sweepRateLimits();

  assert.equal(rateLimit(expired, 1, 60_000).ok, true);
  assert.equal(rateLimit(live, 1, 60_000).ok, false);
});
