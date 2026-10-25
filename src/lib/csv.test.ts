import test from "node:test";
import assert from "node:assert/strict";
import { csvField, toCsv } from "./csv";

test("csvField quotes commas, quotes, and newlines", () => {
  assert.equal(csvField("plain"), "plain");
  assert.equal(csvField("a,b"), '"a,b"');
  assert.equal(csvField('say "hi"'), '"say ""hi"""');
  assert.equal(csvField("line one\nline two"), '"line one\nline two"');
});

test("csvField hardens formula-like strings but leaves numbers alone", () => {
  assert.equal(csvField("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(csvField("@mention"), "'@mention");
  assert.equal(csvField(-5), "-5");
});

test("toCsv emits a CRLF-delimited document with a trailing newline", () => {
  const csv = toCsv(["a", "b"], [
    [1, "x,y"],
    [null, "z"],
  ]);
  assert.equal(csv, 'a,b\r\n1,"x,y"\r\n,z\r\n');
});
