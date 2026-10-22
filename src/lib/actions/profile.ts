"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isBlobUrl, isHexColor, isValidTimezone } from "../validation";
import { deleteBlobs } from "../blob";
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

  // The settings form always sends `image`: a Blob URL to set it, an empty
  // string to clear it. When the field is absent we leave the photo untouched,
  // matching how adminUpdateUser behaves.
  const image = formData.get("image");
  let imageData: string | null | undefined;
  if (image !== null) {
    const value = String(image).trim();
    if (!value) imageData = null;
    else if (isBlobUrl(value) && value.length <= 500) imageData = value;
    else return { ok: false, error: "That image couldn't be saved." };
  }

  const before = await db.user.findUnique({
    where: { id: me.id },
    select: { image: true },
  });

  await db.user.update({
    where: { id: me.id },
    data: {
      name: nameRes.value,
      color,
      timezone,
      ...(imageData !== undefined ? { image: imageData } : {}),
    },
  });

  // Delete the old avatar if it was replaced or cleared.
  if (imageData !== undefined && before?.image && before.image !== imageData) {
    await deleteBlobs([before.image]);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
