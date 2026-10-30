import {
  scrypt as scryptCb,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);

const MAX_PASSWORD_LENGTH = 200;
const MIN_PASSWORD_LENGTH = 8;

/**
 * A real scrypt hash for a throwaway password. Unknown usernames run a dummy
 * verify against this so a missing account and a wrong password take about the
 * same time, which stops the login form from confirming which handles exist.
 */
export const DUMMY_PASSWORD_HASH =
  "7c8a5d9be6fa507058875c724e116991:28381788feaa973fece48c7d9d6882c7899aa783f0379c18c6cb54961f8597df1f533ae0b0bfaba49779a308e6d0e11b3fe133acbfbbcbc28462a2619fe7876b";

/**
 * Hash a password with scrypt. Stored as `salt:hash` (both hex).
 * Async so it doesn't block the event loop under load.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verify a password against a stored `salt:hash`. Constant-time comparison.
 * Async so it doesn't block the event loop under load.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length === 0) return false;
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

/**
 * Validate a password's shape. Returns an error message or null when valid.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}
