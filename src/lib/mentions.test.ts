import test from "node:test";
import assert from "node:assert/strict";
import { mentionedHandles } from "./mentions";

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
