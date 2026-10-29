import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_GPA_SCALE,
  coursePercent,
  gradePointFor,
  neededOnRemaining,
  normalizeGpaScale,
  weightWarning,
} from "./grades";

test("gradePointFor uses the built-in bands", () => {
  assert.equal(gradePointFor(95), 4);
  assert.equal(gradePointFor(90), 4);
  assert.equal(gradePointFor(89.9), 3.5);
  assert.equal(gradePointFor(0), 0);
});

test("a custom scale is honoured and malformed scales are rejected", () => {
  const scale = normalizeGpaScale([
    { minPercent: 0, points: 0 },
    { minPercent: 85, points: 4 },
    { minPercent: 70, points: 3 },
  ]);
  assert.ok(scale);
  assert.equal(gradePointFor(84, scale), 3);
  assert.equal(gradePointFor(86, scale), 4);

  assert.equal(normalizeGpaScale(null), null);
  assert.equal(normalizeGpaScale([]), null);
  assert.equal(
    normalizeGpaScale([
      { minPercent: 10, points: 1 },
      { minPercent: 10, points: 2 },
      { minPercent: 0, points: 0 },
    ]),
    null
  );
  assert.equal(
    normalizeGpaScale([
      { minPercent: 50, points: 2 },
      { minPercent: 0, points: 0 },
    ])?.length,
    2
  );
});

test("coursePercent ignores ungraded items and reports null when empty", () => {
  assert.equal(coursePercent([]), null);
  assert.equal(coursePercent([{ weight: 50, score: null }]), null);
  assert.equal(
    coursePercent([
      { weight: 50, score: 80 },
      { weight: 50, score: null },
    ]),
    80
  );
});

test("neededOnRemaining works out the score required on remaining work", () => {
  const result = neededOnRemaining(
    [
      { weight: 50, score: 85 },
      { weight: 50, score: null },
    ],
    90
  );
  assert.deepEqual(result, { remainingWeight: 50, neededPercent: 95 });

  // Already above target: the required score can be negative.
  const secured = neededOnRemaining(
    [
      { weight: 50, score: 95 },
      { weight: 50, score: null },
    ],
    40
  );
  assert.ok(secured);
  assert.ok(secured.neededPercent < 0);

  // Nothing left to grade.
  assert.equal(neededOnRemaining([{ weight: 100, score: 80 }], 90), null);
  // No weight at all.
  assert.equal(neededOnRemaining([{ weight: 0, score: null }], 90), null);
});

test("neededOnRemaining handles a course whose weights do not total 100", () => {
  const result = neededOnRemaining(
    [
      { weight: 20, score: 90 },
      { weight: 60, score: null },
    ],
    90
  );
  assert.deepEqual(result, { remainingWeight: 60, neededPercent: 90 });
});

test("weightWarning flags totals above and below 100", () => {
  assert.equal(weightWarning([]), null);
  assert.equal(weightWarning([{ weight: 100, score: null }]), null);
  assert.match(weightWarning([{ weight: 40, score: null }]) ?? "", /Add 60%/);
  assert.match(
    weightWarning([
      { weight: 80, score: null },
      { weight: 40, score: null },
    ]) ?? "",
    /Remove 20%/
  );
});

test("the default scale covers every percentage", () => {
  assert.ok(DEFAULT_GPA_SCALE.some((band) => band.minPercent === 0));
});
