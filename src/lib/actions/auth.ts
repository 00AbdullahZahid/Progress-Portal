"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { createSession, destroySession, requireUser, requireAdmin } from "../auth";
import { verifyPassword, hashPassword } from "../security";

export async function signIn(formData: FormData) {
  "use server";
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { handle } });
  if (!user || !password || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid username or password." };
  }
  await createSession(user.id);
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
  if (!verifyPassword(current, me.passwordHash)) {
    return { error: "Current password is incorrect." };
  }
  if (next.length < 6) {
    return { error: "New password must be at least 6 characters." };
  }
  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: hashPassword(next) },
  });
  return { ok: true };
}

export async function adminResetPassword(formData: FormData) {
  "use server";
  await requireAdmin();
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "");
  if (next.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  const user = await db.user.findUnique({ where: { handle } });
  if (!user) return { error: "User not found." };
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(next) },
  });
  return { ok: true, name: user.name };
}
