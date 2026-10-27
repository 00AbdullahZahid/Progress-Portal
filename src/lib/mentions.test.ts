import test from "node:test";
import assert from "node:assert/strict";
import { mentionTokenAt, mentionedHandles } from "./mentions";

test("mentionedHandles finds unique handles and ignores the author", () => {
  assert.deepEqual(
    mentionedHandles("hi @sara and @omar, @sara again. @me", "me"),
    ["sara", "omar"]
  );
});

test("mentionedHandles ignores email-like text and short handles", () => {
  assert.deepEqual(mentionedHandles("mail me at a@b.com or @x", "me"), []);
  assert.deepEqual(mentionedHandles("ping @ab", "me"), ["ab"]);
});

test("mentionTokenAt finds the token at the caret", () => {
  assert.deepEqual(mentionTokenAt("hello @em", 9), {
    start: 6,
    end: 9,
    query: "em",
  });
  assert.deepEqual(mentionTokenAt("@", 1), { start: 0, end: 1, query: "" });
  assert.deepEqual(mentionTokenAt("hi (@Em", 7), {
    start: 4,
    end: 7,
    query: "em",
  });
});

test("mentionTokenAt replaces a whole handle when the caret is mid-token", () => {
  assert.deepEqual(mentionTokenAt("hello @eman", 9), {
    start: 6,
    end: 11,
    query: "em",
  });
});

test("mentionTokenAt stays closed outside a handle token", () => {
  assert.equal(mentionTokenAt("mail me at a@b.com", 16), null);
  assert.equal(mentionTokenAt("hi @sara ", 9), null);
  assert.equal(mentionTokenAt("plain text", 5), null);
});
