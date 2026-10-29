"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText, isHexColor } from "../validation";
import type { ActionResult } from "./tasks";

function refresh() {
  revalidatePath("/timetable");
  revalidatePath("/dashboard");
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

type EntryFields = {
  title: string;
  location: string | null;
  weekday: number;
  startMin: number;
  endMin: number;
  color: string;
};

/** Validate the shared fields used by both create and edit. */
function parseEntryFields(
  formData: FormData
): { ok: true; fields: EntryFields } | { ok: false; error: string } {
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

  return {
    ok: true,
    fields: {
      title: titleRes.value,
      location: locationRes.value || null,
      weekday,
      startMin,
      endMin,
      color,
    },
  };
}

/** Only the owner of a personal entry or an admin of a group entry may change it. */
function canChangeEntry(
  me: { id: string; role: string },
  entry: { ownerId: string; scope: "group" | "personal" }
): boolean {
  if (entry.scope === "personal") return entry.ownerId === me.id;
  return me.role === "admin";
}

export async function createTimetableEntry(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  // Only admins may add a class to the shared timetable. Anyone may add a
  // personal class, which only they (and their calendar feed) can see.
  const scope = formData.get("scope") === "personal" ? "personal" : "group";
  if (scope === "group" && me.role !== "admin")
    return { ok: false, error: "Only an admin can add a group class." };

  const parsed = parseEntryFields(formData);
  if (!parsed.ok) return parsed;

  await db.timetableEntry.create({
    data: {
      // Also records who added a group class, and owns personal entries.
      ownerId: me.id,
      scope,
      ...parsed.fields,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateTimetableEntry(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("entryId") ?? "");
  const entry = await db.timetableEntry.findUnique({
    where: { id },
    select: { ownerId: true, scope: true },
  });
  if (!entry) return { ok: false, error: "Entry not found." };
  if (!canChangeEntry(me, entry))
    return { ok: false, error: "You can only edit your own entries." };

  const parsed = parseEntryFields(formData);
  if (!parsed.ok) return parsed;

  // Scope is intentionally not editable: a personal class cannot be promoted
  // to the group timetable without going through the admin-only create path.
  await db.timetableEntry.update({
    where: { id },
    data: parsed.fields,
  });
  refresh();
  return { ok: true };
}

export async function deleteTimetableEntry(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const id = String(formData.get("entryId") ?? "");
  const entry = await db.timetableEntry.findUnique({
    where: { id },
    select: { id: true, ownerId: true, scope: true },
  });
  if (!entry) return { ok: false, error: "Entry not found." };
  if (!canChangeEntry(me, entry))
    return { ok: false, error: "You can only remove your own entries." };

  await db.timetableEntry.delete({ where: { id } });
  refresh();
  return { ok: true };
}
