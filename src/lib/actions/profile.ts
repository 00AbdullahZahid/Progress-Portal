"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isHexColor, isValidTimezone } from "../validation";
import type { ActionResult } from "./tasks";

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();

  const nameRes = cleanText(formData.get("name"), 40);
  if (!nameRes.ok) return nameRes;

  const color = String(formData.get("color") ?? "").trim();
  if (!isHexColor(color))
    return { ok: false, error: "Please choose a valid color." };

  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!isValidTimezone(timezone))
    return { ok: false, error: "Please choose a valid timezone." };

  await db.user.update({
    where: { id: me.id },
    data: { name: nameRes.value, color, timezone },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
