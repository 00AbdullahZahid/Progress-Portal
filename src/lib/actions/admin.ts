"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireAdmin } from "../auth";

const HANDLE_RE = /^[a-z0-9_]{2,20}$/;

export async function adminUpdateUser(formData: FormData) {
  "use server";
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Missing user." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  const color = String(formData.get("color") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const role = String(formData.get("role") ?? "member");

  if (!name) return { error: "Name is required." };
  if (!HANDLE_RE.test(handle))
    return { error: "Username must be 2-20 chars: lowercase letters, numbers, or _." };
  if (!["admin", "member"].includes(role)) return { error: "Invalid role." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found." };

  // Prevent an admin from demoting themselves (avoids locking out the last admin).
  if (target.id === me.id && role !== "admin") {
    return { error: "You can't remove your own admin role." };
  }

  // Ensure the username is unique (excluding this user).
  const clash = await db.user.findFirst({ where: { handle, NOT: { id: userId } } });
  if (clash) return { error: "That username is already taken." };

  await db.user.update({
    where: { id: userId },
    data: {
      name,
      handle,
      role,
      ...(color ? { color } : {}),
      ...(timezone ? { timezone } : {}),
    },
  });

  revalidatePath("/people");
  revalidatePath("/settings");
  return { ok: true };
}
