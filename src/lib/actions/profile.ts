"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";

export async function updateProfile(formData: FormData) {
  "use server";
  const me = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const color = String(formData.get("color") ?? "#6366f1");
  const timezone = String(formData.get("timezone") ?? "UTC").trim();
  if (name) {
    await db.user.update({
      where: { id: me.id },
      data: { name, color, timezone },
    });
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
