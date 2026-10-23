import { timingSafeEqual } from "crypto";

/**
 * Constant-time comparison so a wrong secret can't be recovered by timing.
 */
function secretMatches(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Only the `Authorization: Bearer <CRON_SECRET>` header is accepted, so the
 * secret never appears in a URL or an access log. With no secret configured
 * the job runs only outside production.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  return secretMatches(auth.slice(7), secret);
}
