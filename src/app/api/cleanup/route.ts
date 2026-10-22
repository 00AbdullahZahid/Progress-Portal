import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Daily cleanup job for orphaned uploads.
 *
 * A file is orphaned when it was never attached to a saved row ("claimedAt" is
 * null) and is more than 24 hours old, or when its `Upload` row points at a URL
 * no saved row references anymore. Vercel Cron hits this with the configured
 * secret; manual runs can pass `?key=<CRON_SECRET>`.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" for cron invocations.
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  // Allow a manual trigger with ?key= when no header is present.
  const url = new URL(request.url);
  if (secret && url.searchParams.get("key") === secret) return true;
  // With no secret configured, only allow in development.
  return !secret && process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: "blob storage not configured" });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Unclaimed uploads older than a day: never finished a form submission.
  const stale = await db.upload.findMany({
    where: { claimedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, url: true },
  });

  let removed = 0;
  const toDelete: string[] = [];
  const rowsToClear: string[] = [];

  for (const u of stale) {
    // Guard against reaping a file that an older row ended up referencing.
    const [sessionRefs, noteRefs] = await Promise.all([
      db.studySession.count({ where: { OR: [{ image: u.url }, { fileUrl: u.url }] } }),
      db.note.count({ where: { OR: [{ image: u.url }, { fileUrl: u.url }] } }),
    ]);
    if (sessionRefs === 0 && noteRefs === 0) {
      toDelete.push(u.url);
      rowsToClear.push(u.id);
      removed++;
    }
  }

  if (toDelete.length > 0) {
    try {
      await del(toDelete);
    } catch {
      // Best effort — try again next run.
    }
    await db.upload.deleteMany({ where: { id: { in: rowsToClear } } });
  }

  return NextResponse.json({ scanned: stale.length, removed });
}
