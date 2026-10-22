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

  const image = formData.get("image");
  let imageData: string | null = null;
  if (image && typeof image === "string" && image.trim()) {
    const value = image.trim();
    // Accept a blob URL from our upload endpoint (https) or a data URL as a
    // legacy fallback, but never store arbitrary oversized strings.
    const ok =
      value.startsWith("https://") ||
      value.startsWith("http://localhost") ||
      value.startsWith("data:image/");
    if (!ok || value.length > 5_000_000) {
      return { ok: false, error: "That image couldn't be saved." };
    }
    imageData = value;
  }

  await db.user.update({
    where: { id: me.id },
    // `image` is always written, so clearing the photo (empty field) works.
    data: { name: nameRes.value, color, timezone, image: imageData },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
