/**
 * Shared input validation helpers used by server actions.
 * Every value that reaches the database or an inline style is checked here.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** How far back a user may back-date a check-in or study session. */
export const MAX_BACKDATE_DAYS = 365;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** A timezone is valid only if the runtime can actually format with it. */
export function isValidTimezone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The list of timezones this runtime supports, with a UTC fallback. */
export function supportedTimezones(): string[] {
  try {
    const list = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf?.("timeZone");
    if (list && list.length) return list;
  } catch {}
  return ["UTC"];
}

/** True when `value` is a real calendar date in `YYYY-MM-DD` form. */
export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return false;
  // Rejects things like 2026-02-31 which roll over.
  return d.toISOString().slice(0, 10) === value;
}

/**
 * Validate a user-supplied date for check-ins / study logs.
 * Must be a real calendar date, not in the future, and not too far back.
 */
export function validateLogDate(
  value: string,
  today: string
): { ok: true; date: string } | { ok: false; error: string } {
  if (!isValidDateString(value))
    return { ok: false, error: "Please pick a valid date." };

  if (value > today) return { ok: false, error: "You can't log a future date." };

  const floor = new Date(today + "T00:00:00Z");
  floor.setUTCDate(floor.getUTCDate() - MAX_BACKDATE_DAYS);
  if (value < floor.toISOString().slice(0, 10))
    return {
      ok: false,
      error: `You can't log a date more than ${MAX_BACKDATE_DAYS} days ago.`,
    };

  return { ok: true, date: value };
}

/** Trim and bound a free-text field. */
export function cleanText(
  value: unknown,
  max: number,
  { required = true }: { required?: boolean } = {}
): { ok: true; value: string } | { ok: false; error: string } {
  const text = String(value ?? "").trim();
  if (!text) {
    if (required) return { ok: false, error: "This field is required." };
    return { ok: true, value: "" };
  }
  if (text.length > max)
    return { ok: false, error: `Please keep this under ${max} characters.` };
  return { ok: true, value: text };
}

export const HANDLE_RE = /^[a-z0-9_]{2,20}$/;

/**
 * True only for URLs served by Vercel Blob storage.
 *
 * Uploads always produce a URL like
 *   https://<store>.public.blob.vercel-storage.com/uploads/...
 * so anything else (an arbitrary external link, a phishing URL, or a base64
 * `data:` URL) is rejected. The host must END with the Blob domain, which also
 * blocks look-alikes such as `https://x.public.blob.vercel-storage.com.evil.com`.
 */
export function isBlobUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return url.hostname.endsWith(".public.blob.vercel-storage.com");
}
