import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referencedUrls, removeBlobFiles } from "@/lib/blob";
import { cronAuthorized } from "@/lib/cron";

const DAY = 24 * 60 * 60 * 1000;

/** How many claimed uploads to re-check per run. Keeps the cron bounded. */
const CLAIMED_BATCH = 100;

type UploadRow = { id: string; url: string };

/**
 * Delete the given blobs, falling back to one-by-one when a batch fails.
 * Returns the ids whose file is gone (deleted or already missing) so the
 * tracking rows can be removed.
 */
async function removeBlobs(rows: UploadRow[]): Promise<string[]> {
  if (rows.length === 0) return [];
  const gone = new Set(await removeBlobFiles(rows.map((u) => u.url)));
  return rows.filter((u) => gone.has(u.url)).map((u) => u.id);
}

/**
 * Daily cleanup job for orphaned uploads.
 *
 * Two passes:
 *
 * 1. Unclaimed uploads older than 24 hours never finished a form submission.
 * 2. Claimed uploads that are older than 7 days are re-checked in bounded
 *    batches. A claim only proves the file was attached once; it can become an
 *    orphan later when the row is edited or deleted. Referenced rows have their
 *    `claimedAt` bumped so the queue rotates and every row is eventually
 *    checked without scanning the whole table each night.
 *
 * Before deleting anything, every table that can hold a blob URL is checked,
 * so avatars and resource files are never reaped even if their action forgot to
 * claim them.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: "blob storage not configured" });
  }

  // Pass 1: never-claimed uploads.
  const cutoff = new Date(Date.now() - DAY);
  const stale = await db.upload.findMany({
    where: { claimedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, url: true },
  });

  const referenced = await referencedUrls(
    db,
    stale.map((u) => u.url)
  );

  const toDelete: UploadRow[] = [];
  const rowsToClear: string[] = [];
  for (const u of stale) {
    if (referenced.has(u.url)) {
      // It is used — mark it claimed so we stop re-checking it every night.
      rowsToClear.push(u.id);
      continue;
    }
    toDelete.push(u);
  }

  const unclaimedDeleted = await removeBlobs(toDelete);
  if (unclaimedDeleted.length > 0) {
    await db.upload.deleteMany({ where: { id: { in: unclaimedDeleted } } });
  }
  if (rowsToClear.length > 0) {
    await db.upload.updateMany({
      where: { id: { in: rowsToClear } },
      data: { claimedAt: new Date() },
    });
  }

  // Pass 2: claimed uploads that may have been orphaned by a later edit/delete.
  // Ordering by claimedAt makes this a rotating queue: referenced rows move to
  // the end when their claim is refreshed.
  const claimedCutoff = new Date(Date.now() - 7 * DAY);
  const staleClaimed = await db.upload.findMany({
    where: { claimedAt: { not: null, lt: claimedCutoff } },
    select: { id: true, url: true },
    orderBy: { claimedAt: "asc" },
    take: CLAIMED_BATCH,
  });

  const claimedReferenced = await referencedUrls(
    db,
    staleClaimed.map((u) => u.url)
  );

  const claimedToDelete = staleClaimed.filter(
    (u) => !claimedReferenced.has(u.url)
  );
  const claimedToTouch = staleClaimed
    .filter((u) => claimedReferenced.has(u.url))
    .map((u) => u.id);

  const claimedDeleted = await removeBlobs(claimedToDelete);
  if (claimedDeleted.length > 0) {
    await db.upload.deleteMany({ where: { id: { in: claimedDeleted } } });
  }
  if (claimedToTouch.length > 0) {
    await db.upload.updateMany({
      where: { id: { in: claimedToTouch } },
      data: { claimedAt: new Date() },
    });
  }

  return NextResponse.json({
    scanned: stale.length,
    removed: unclaimedDeleted.length,
    claimedScanned: staleClaimed.length,
    claimedRemoved: claimedDeleted.length,
  });
}
