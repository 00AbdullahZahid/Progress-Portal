"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isHexColor } from "../validation";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/timetable");
}

/** Parse "HH:MM" into minutes since midnight, or null when invalid. */
function parseTime(value: unknown): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export async function createTimetableEntry(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const titleRes = cleanText(formData.get("title"), 100);
  if (!titleRes.ok) return titleRes;
  const locationRes = cleanText(formData.get("location"), 80, { required: false });
  if (!locationRes.ok) return locationRes;

  const weekday = Number(formData.get("weekday"));
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
    return { ok: false, error: "Pick a valid day." };

  const startMin = parseTime(formData.get("start"));
  const endMin = parseTime(formData.get("end"));
  if (startMin === null || endMin === null)
    return { ok: false, error: "Enter valid start and end times." };
  if (endMin <= startMin)
    return { ok: false, error: "The end time must be after the start." };

  const colorRaw = String(formData.get("color") ?? "").trim();
  const color = isHexColor(colorRaw) ? colorRaw : "#2563eb";

  await db.timetableEntry.create({
    data: {
      ownerId: me.id,
      weekday,
      startMin,
      endMin,
      title: titleRes.value,
      location: locationRes.value || null,
      color,
    },
  });
  refresh();
  return { ok: true };
}

export async function deleteTimetableEntry(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("entryId") ?? "");
  const entry = await db.timetableEntry.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!entry) return { ok: false, error: "Entry not found." };
  if (entry.ownerId !== me.id && me.role !== "admin")
    return { ok: false, error: "You can only edit your own timetable." };

  await db.timetableEntry.delete({ where: { id } });
  refresh();
  return { ok: true };
}
