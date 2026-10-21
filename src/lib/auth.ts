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
  const token = await new SignJWT({ userId, v: tokenVersion })
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

type SessionPayload = { userId: string; v: number };

async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
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
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  if (user.tokenVersion !== session.v) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: { role: string }): boolean {
  return user.role === "admin";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
