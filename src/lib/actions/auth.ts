"use server";

import { redirect } from "next/navigation";
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

export async function signIn(formData: FormData) {
  "use server";
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Cap the password before hashing so a huge string can't burn CPU.
  if (!handle || !password || password.length > 200) {
    return { error: "Invalid username or password." };
  }

  sweepRateLimits();
  const limit = rateLimit(`login:${handle}`, 10, 60_000);
  if (!limit.ok) {
    return {
      error: `Too many attempts. Please wait ${limit.retryAfterSeconds}s and try again.`,
    };
  }

  const user = await db.user.findUnique({ where: { handle } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
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
