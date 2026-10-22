"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireAdmin } from "../auth";
import {
  cleanText,
  isBlobUrl,
  isHexColor,
  isValidTimezone,
  HANDLE_RE,
} from "../validation";
import { hashPassword, validatePassword } from "../security";
import { audit } from "../audit";
import { deleteBlobs } from "../blob";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/people");
  revalidatePath("/settings");
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function adminUpdateUser(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Missing user." };

  const nameRes = cleanText(formData.get("name"), 40);
  if (!nameRes.ok) return nameRes;

  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!HANDLE_RE.test(handle))
    return {
      ok: false,
      error: "Username must be 2-20 chars: lowercase letters, numbers, or _.",
    };

  const color = String(formData.get("color") ?? "").trim();
  if (!isHexColor(color)) return { ok: false, error: "Invalid color." };

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!isValidTimezone(timezone))
    return { ok: false, error: "Invalid timezone." };

  const roleRaw = String(formData.get("role") ?? "member");
  if (roleRaw !== "admin" && roleRaw !== "member")
    return { ok: false, error: "Invalid role." };
  const role: "admin" | "member" = roleRaw;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  // Prevent an admin from demoting themselves (avoids locking out the last admin).
  if (target.id === me.id && role !== "admin") {
    return { ok: false, error: "You can't remove your own admin role." };
  }

  const clash = await db.user.findFirst({
    where: { handle, NOT: { id: userId } },
  });
  if (clash) return { ok: false, error: "That username is already taken." };

  // Optional: a super admin may set or clear another user's photo.
  const imageRaw = formData.get("image");
  const data: {
    name: string;
    handle: string;
    role: "admin" | "member";
    color: string;
    timezone: string;
    image?: string | null;
  } = { name: nameRes.value, handle, role, color, timezone };

  if (imageRaw !== null) {
    const value = String(imageRaw).trim();
    if (!value) data.image = null;
    else if (isBlobUrl(value) && value.length <= 500) data.image = value;
    else return { ok: false, error: "That image couldn't be saved." };
  }

  await db.user.update({ where: { id: userId }, data });

  // Clean up the previous avatar if this update replaced or cleared it.
  if (data.image !== undefined && target.image && target.image !== data.image) {
    await deleteBlobs([target.image]);
  }

  await audit(me.id, "user.update", {
    targetId: userId,
    detail: `@${target.handle} -> @${handle}`,
  });

  refresh();
  return { ok: true };
}

export async function adminCreateUser(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();

  const nameRes = cleanText(formData.get("name"), 40);
  if (!nameRes.ok) return nameRes;

  const handle = String(formData.get("handle") ?? "").trim().toLowerCase();
  if (!HANDLE_RE.test(handle))
    return {
      ok: false,
      error: "Username must be 2-20 chars: lowercase letters, numbers, or _.",
    };

  const password = String(formData.get("password") ?? "");
  const invalid = validatePassword(password);
  if (invalid) return { ok: false, error: invalid };

  const color = String(formData.get("color") ?? "#2563eb").trim();
  if (!isHexColor(color)) return { ok: false, error: "Invalid color." };

  const timezone = String(formData.get("timezone") ?? "Asia/Karachi").trim();
  if (!isValidTimezone(timezone))
    return { ok: false, error: "Invalid timezone." };

  const roleRaw = String(formData.get("role") ?? "member");
  if (roleRaw !== "admin" && roleRaw !== "member")
    return { ok: false, error: "Invalid role." };
  const role: "admin" | "member" = roleRaw;

  const clash = await db.user.findUnique({ where: { handle } });
  if (clash) return { ok: false, error: "That username is already taken." };

  const created = await db.user.create({
    data: {
      name: nameRes.value,
      handle,
      role,
      color,
      timezone,
      passwordHash: await hashPassword(password),
    },
  });
  await audit(me.id, "user.create", {
    targetId: created.id,
    detail: `created @${handle} (${role})`,
  });

  refresh();
  return { ok: true };
}

export async function adminSetActive(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "") === "1";

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };
  if (target.id === me.id)
    return { ok: false, error: "You can't deactivate your own account." };

  await db.user.update({
    where: { id: userId },
    data: {
      isActive: active,
      // Bump so any live session is revoked the moment they're deactivated.
      tokenVersion: { increment: 1 },
    },
  });
  await audit(me.id, active ? "user.activate" : "user.deactivate", {
    targetId: userId,
    detail: `@${target.handle}`,
  });

  refresh();
  return { ok: true };
}

export async function adminDeleteUser(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (userId === me.id)
    return { ok: false, error: "You can't delete your own account." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found." };

  const adminCount = await db.user.count({ where: { role: "admin" } });
  if (target.role === "admin" && adminCount <= 1) {
    return { ok: false, error: "You can't delete the last admin." };
  }

  // Gather every blob this user owns (avatar + study attachments) so storage
  // doesn't keep files nobody references anymore.
  const ownedSessions = await db.studySession.findMany({
    where: { userId },
    select: { image: true, fileUrl: true },
  });

  await db.user.delete({ where: { id: userId } });

  await deleteBlobs([
    target.image,
    ...ownedSessions.flatMap((s) => [s.image, s.fileUrl]),
  ]);

  await audit(me.id, "user.delete", {
    targetId: userId,
    detail: `deleted @${target.handle}`,
  });

  refresh();
  return { ok: true };
}
