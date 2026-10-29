/**
 * Grade maths shared by the Grades UI and its tests. Everything here is pure
 * so the edge cases (empty weights, fully graded courses, impossible targets)
 * can be verified without a database.
 */

export type GradeBand = {
  /** Lowest percentage that earns this band, 0-100. */
  minPercent: number;
  /** Grade points awarded at or above `minPercent`. */
  points: number;
  /** Optional short label such as "A" or "B+". */
  label?: string;
};

export type GradeItemLike = {
  weight: number;
  score: number | null;
};

/**
 * The built-in scale used before a member customises it. Bands are checked from
 * the highest percentage down, so ordering in this array does not matter.
 */
export const DEFAULT_GPA_SCALE: GradeBand[] = [
  { minPercent: 90, points: 4, label: "A" },
  { minPercent: 80, points: 3.5, label: "B+" },
  { minPercent: 70, points: 3, label: "B" },
  { minPercent: 60, points: 2.5, label: "C+" },
  { minPercent: 50, points: 2, label: "C" },
  { minPercent: 40, points: 1, label: "D" },
  { minPercent: 0, points: 0, label: "F" },
];

/**
 * Accept only a sensible, complete scale. Returns null for anything malformed
 * so callers can fall back to the built-in bands instead of half-applying an
 * invalid profile.
 */
export function normalizeGpaScale(value: unknown): GradeBand[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) return null;

  const bands: GradeBand[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const band = raw as Record<string, unknown>;
    const minPercent = Number(band.minPercent);
    const points = Number(band.points);
    if (!Number.isFinite(minPercent) || minPercent < 0 || minPercent > 100)
      return null;
    if (!Number.isFinite(points) || points < 0 || points > 10) return null;

    const label =
      typeof band.label === "string" && band.label.trim()
        ? band.label.trim().slice(0, 12)
        : undefined;
    bands.push({ minPercent, points, ...(label ? { label } : {}) });
  }

  bands.sort((a, b) => b.minPercent - a.minPercent);
  if (new Set(bands.map((band) => band.minPercent)).size !== bands.length)
    return null;

  // A scale must cover the bottom of the range or a 0% score has no band.
  if (bands[bands.length - 1].minPercent !== 0) return null;
  return bands;
}

/** Grade points for a percentage, using the member's scale. */
export function gradePointFor(
  percent: number,
  scale: GradeBand[] = DEFAULT_GPA_SCALE
): number {
  for (const band of scale) {
    if (percent >= band.minPercent) return band.points;
  }
  return 0;
}

/** Weighted percentage across graded items; null when nothing is graded yet. */
export function coursePercent(items: GradeItemLike[]): number | null {
  const graded = items.filter((item) => item.score !== null);
  const weight = graded.reduce((sum, item) => sum + item.weight, 0);
  if (weight === 0) return null;
  const earned = graded.reduce(
    (sum, item) => sum + (item.score ?? 0) * item.weight,
    0
  );
  return earned / weight;
}

export type NeededResult = {
  remainingWeight: number;
  neededPercent: number;
};

/**
 * Percentage required across every ungraded item to reach `targetPercent`.
 * Uses the course's declared weight total, so a course whose weights add up to
 * less than 100% is not silently graded out of a smaller denominator.
 */
export function neededOnRemaining(
  items: GradeItemLike[],
  targetPercent: number
): NeededResult | null {
  if (!Number.isFinite(targetPercent)) return null;
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const remainingWeight = items
    .filter((item) => item.score === null)
    .reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0 || remainingWeight <= 0) return null;

  const earned = items.reduce(
    (sum, item) => sum + (item.score ?? 0) * item.weight,
    0
  );
  const neededPercent =
    (targetPercent * totalWeight - earned) / remainingWeight;
  return { remainingWeight, neededPercent };
}

/**
 * A warning when the course weights do not add up to 100%. Returns null when
 * the total is exactly 100 or when there are no items yet.
 */
export function weightWarning(items: GradeItemLike[]): string | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total === 100) return null;
  if (total < 100)
    return `Weights add up to ${total}%. Add ${100 - total}% more for a complete course.`;
  return `Weights add up to ${total}%. Remove ${total - 100}% to get back to 100%.`;
}
