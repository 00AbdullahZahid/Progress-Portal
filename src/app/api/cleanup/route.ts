import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { referencedUrls } from "@/lib/blob";

export const runtime = "nodejs";

/**
 * Constant-time comparison so a wrong secret can't be recovered by timing.
 */
function secretMatches(provided: string, secret: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Only the `Authorization: Bearer <CRON_SECRET>` header is accepted, so the
 * secret never appears in a URL or an access log. With no secret configured
 * the job runs only outside production.
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  return secretMatches(auth.slice(7), secret);
}

/**
 * Daily cleanup job for orphaned uploads.
 *
 * A file is orphaned when it was never attached to a saved row ("claimedAt" is
 * null) and is more than 24 hours old. Before deleting, every table that can
 * hold a blob URL is checked, so avatars and resource files are never reaped
 * even if their action forgot to claim them.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
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

  // One reference query for every candidate at once.
  const referenced = await referencedUrls(db, stale.map((u) => u.url));

  const toDelete: string[] = [];
  const rowsToClear: string[] = [];
  for (const u of stale) {
    // Guard against reaping a file that any saved row still points at.
    if (referenced.has(u.url)) {
      // It is used — mark it claimed so we stop re-checking it every night.
      rowsToClear.push(u.id);
      continue;
    }
    toDelete.push(u.url);
  }

  let removed = 0;
  if (toDelete.length > 0) {
    try {
      await del(toDelete);
      removed = toDelete.length;
    } catch {
      // Best effort — try again next run.
    }
  }

  // Drop the rows for deleted files and for referenced-but-unclaimed files that
  // we just confirmed are in use.
  if (rowsToClear.length > 0) {
    await db.upload.updateMany({
      where: { id: { in: rowsToClear } },
      data: { claimedAt: new Date() },
    });
  }

  return NextResponse.json({ scanned: stale.length, removed });
}
