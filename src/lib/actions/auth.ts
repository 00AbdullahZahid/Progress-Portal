"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "../db";
import {
  createSession,
  destroySession,
  requireUser,
  requireAdmin,
} from "../auth";
import {
  verifyPassword,
  hashPassword,
  validatePassword,
} from "../security";
import { rateLimit, resetRateLimit, sweepRateLimits } from "../rate-limit";
import { audit } from "../audit";

/**
 * A real scrypt hash for a throwaway password. Unknown usernames run a dummy
 * verify against this so a missing account and a wrong password take about the
 * same time, which stops the login form from confirming which handles exist.
 */
const DUMMY_PASSWORD_HASH =
  "7c8a5d9be6fa507058875c724e116991:28381788feaa973fece48c7d9d6882c7899aa783f0379c18c6cb54961f8597df1f533ae0b0bfaba49779a308e6d0e11b3fe133acbfbbcbc28462a2619fe7876b";

export async function signIn(formData: FormData) {
  "use server";
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Cap the password before hashing so a huge string can't burn CPU.
  if (!handle || !password || password.length > 200) {
    return { error: "Invalid username or password." };
  }

  sweepRateLimits();

  // Per-network limit: the per-username bucket alone would let an attacker
  // spray many different usernames from the same machine.
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown";
  const ipLimit = rateLimit(`login-ip:${ip}`, 30, 60_000);
  if (!ipLimit.ok) {
    return {
      error: `Too many attempts from this network. Please wait ${ipLimit.retryAfterSeconds}s and try again.`,
    };
  }

  const limit = rateLimit(`login:${handle}`, 10, 60_000);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Please wait ${limit.retryAfterSeconds}s and try again.`,
    };
  }

  const user = await db.user.findUnique({ where: { handle } });

  // Always run one scrypt verify, even for an unknown handle, so response time
  // doesn't disclose whether the username exists.
  const passwordOk = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !user.isActive || !passwordOk) {
    return { error: "Invalid username or password." };
  }

  resetRateLimit(`login:${handle}`);
  await createSession(user.id, user.tokenVersion);
  redirect("/dashboard");
}

export async function signOut() {
  "use server";
  await destroySession();
  redirect("/login");
}

export async function changeOwnPassword(formData: FormData) {
  "use server";
  const me = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  if (current.length > 200 || next.length > 200) {
    return { error: "Password is too long." };
  }
  if (!(await verifyPassword(current, me.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  const invalid = validatePassword(next);
  if (invalid) return { error: invalid };

  // Bump tokenVersion so every other session (including any stolen cookie) dies.
  await db.user.update({
    where: { id: me.id },
    data: {
      passwordHash: await hashPassword(next),
      tokenVersion: { increment: 1 },
    },
  });
  await audit(me.id, "user.password_change", { targetId: me.id });

  // Re-issue the current session so this browser stays signed in.
  const fresh = await db.user.findUnique({ where: { id: me.id } });
  if (fresh) await createSession(fresh.id, fresh.tokenVersion);

  return { ok: true };
}

export async function adminResetPassword(formData: FormData) {
  "use server";
  const me = await requireAdmin();
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "");

  const invalid = validatePassword(next);
  if (invalid) return { error: invalid };

  const user = await db.user.findUnique({ where: { handle } });
  if (!user) return { error: "User not found." };

  // Revoke all of the target user's existing sessions.
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(next),
      tokenVersion: { increment: 1 },
    },
  });
  await audit(me.id, "user.password_reset", {
    targetId: user.id,
    detail: `reset @${user.handle}`,
  });

  return { ok: true, name: user.name };
}
