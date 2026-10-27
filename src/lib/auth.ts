import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "portal_session";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short. Set a 32+ character random value before running in production."
      );
    }
    // Development-only fallback so local work isn't blocked.
    return new TextEncoder().encode(
      "dev-only-insecure-secret-do-not-use-in-production"
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, tokenVersion: number) {
  const token = await new SignJWT({ userId, v: tokenVersion, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * Create a long-lived, read-only token for a member's calendar feed. The token
 * is separate from the session cookie and is revoked by the same tokenVersion
 * bump used for password resets and deactivation.
 */
export async function createCalendarToken(
  userId: string,
  tokenVersion: number
): Promise<string> {
  return new SignJWT({ userId, v: tokenVersion, purpose: "calendar" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getSecret());
}

/**
 * Issue a calendar token without exposing `tokenVersion` on the user object
 * returned to pages and actions.
 */
export async function createCalendarTokenForUser(userId: string) {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  return row ? createCalendarToken(userId, row.tokenVersion) : null;
}

export async function verifyCalendarToken(
  token: string
): Promise<{ userId: string; v: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "calendar") return null;
    const userId = payload.userId as string | undefined;
    const v = typeof payload.v === "number" ? payload.v : 0;
    if (!userId) return null;
    return { userId, v };
  } catch {
    return null;
  }
}

type SessionPayload = { userId: string; v: number };

/**
 * Everything the signed-in user can need on the server, minus the two fields
 * that must never leave this module. `tokenVersion` is selected only so the
 * session can be validated, then stripped before the user is returned.
 */
const SESSION_USER_SELECT = {
  id: true,
  handle: true,
  name: true,
  role: true,
  color: true,
  image: true,
  timezone: true,
  isActive: true,
  weeklyGoalMinutes: true,
  streakFreezesFree: true,
  notifyTasks: true,
  notifyExams: true,
  notifyTaskAssigned: true,
  notifyTaskComments: true,
  notifyTaskStatus: true,
  notifyTaskDue: true,
  notifyNewProjects: true,
  notifyPush: true,
  lastSeenAt: true,
  chatReadAt: true,
  tokenVersion: true,
} as const;

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Calendar tokens are signed with the same secret but must never be
    // accepted as a browser session. Legacy session cookies have no purpose.
    if (payload.purpose && payload.purpose !== "session") return null;
    const userId = payload.userId as string | undefined;
    const v = typeof payload.v === "number" ? payload.v : 0;
    if (!userId) return null;
    return { userId, v };
  } catch {
    return null;
  }
}

/**
 * Resolve the signed-in user. Cached per request so the layout and page
 * don't each hit the database. Returns null when the session is missing,
 * the user no longer exists, is deactivated, or was revoked by a token bump.
 */
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session) return null;
  const row = await db.user.findUnique({
    where: { id: session.userId },
    select: SESSION_USER_SELECT,
  });
  if (!row || !row.isActive) return null;
  if (row.tokenVersion !== session.v) return null;
  // The session check is the only reason tokenVersion was selected. Return the
  // rest so a page or action can never forward it (or passwordHash) by accident.
  const { tokenVersion, ...user } = row;
  void tokenVersion;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const store = await cookies();
    redirect(store.get(COOKIE)?.value ? "/login?expired=1" : "/login");
  }
  return user;
}

export function isAdmin(user: { role: string }): boolean {
  return user.role === "admin";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    const store = await cookies();
    redirect(store.get(COOKIE)?.value ? "/login?expired=1" : "/login");
  }
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
