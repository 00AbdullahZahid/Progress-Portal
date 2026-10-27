import { BlobNotFoundError, del } from "@vercel/blob";
import { isBlobUrl } from "./validation";

/** True when a blob is already gone, so its tracking row can be removed too. */
function isMissingBlob(err: unknown): boolean {
  return (
    err instanceof BlobNotFoundError ||
    (err instanceof Error && err.name === "BlobNotFoundError")
  );
}

/**
 * Delete blob files and report which URLs no longer exist. A URL that was
 * already missing counts as gone: leaving its `Upload` row behind would make
 * the cleanup job retry it forever and leak a row per deleted file.
 *
 * A batch delete is tried first; if it fails, each URL is retried alone so one
 * bad file can't block the rest. Failures other than "not found" are left for
 * the next cleanup run.
 */
export async function removeBlobFiles(
  urls: (string | null | undefined)[]
): Promise<string[]> {
  const targets = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (targets.length === 0) return [];

  try {
    await del(targets);
    return targets;
  } catch {
    const gone: string[] = [];
    for (const url of targets) {
      try {
        await del(url);
        gone.push(url);
      } catch (err) {
        if (isMissingBlob(err)) gone.push(url);
      }
    }
    return gone;
  }
}

/**
 * Best-effort deletion of blobs we no longer reference.
 *
 * Blob cleanup must never break the main action, so every failure (missing
 * token, already-deleted file, network hiccup) is swallowed. Only URLs that are
 * valid Blob URLs are sent to `del`, so a stale non-Blob value can't cause a
 * request to an arbitrary host.
 *
 * Ownership is NOT checked here — callers are responsible for proving the actor
 * owns the file (see `deletableUrls`) before passing URLs in.
 */
export async function deleteBlobs(urls: (string | null | undefined)[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const gone = await removeBlobFiles(urls);
  if (gone.length === 0) return;

  // Remove the ownership rows in the same best-effort pass. Otherwise every
  // direct delete leaves a row whose blob is already gone; the cleanup job
  // later treats the missing file as a permanent failure and keeps the row.
  try {
    const { db } = await import("./db");
    await db.upload.deleteMany({ where: { url: { in: gone } } });
  } catch {
    // Ignore — the cleanup job will remove the row once it sees the file gone.
  }
}

/**
 * The subset of the Prisma client that reference-checking needs. Typed loosely
 * so this module stays independent of the generated client's exact shape.
 */
type Db = {
  upload: {
    findMany: (args: {
      where: { url: { in: string[] } };
      select: { url: true; ownerId: true };
    }) => Promise<{ url: string; ownerId: string }[]>;
    updateMany: (args: {
      where: { ownerId: string; url: { in: string[] } };
      data: { claimedAt: Date };
    }) => Promise<{ count: number }>;
    findFirst: (args: {
      where: { url: string; ownerId: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
  studySession: {
    findMany: (args: {
      where: {
        OR: { image?: string; fileUrl?: string }[];
        userId?: string;
        NOT?: { id: string };
      };
      select: { image: true; fileUrl: true };
    }) => Promise<{ image: string | null; fileUrl: string | null }[]>;
  };
  note: {
    findMany: (args: {
      where: {
        OR: { image?: string; fileUrl?: string }[];
        authorId?: string;
        NOT?: { id: string };
      };
      select: { image: true; fileUrl: true };
    }) => Promise<{ image: string | null; fileUrl: string | null }[]>;
  };
  user: {
    findMany: (args: {
      where: { image: { in: string[] }; NOT?: { id: string } };
      select: { image: true };
    }) => Promise<{ image: string | null }[]>;
  };
  resource: {
    findMany: (args: {
      where: { url: { in: string[] }; NOT?: { id: string } };
      select: { url: true };
    }) => Promise<{ url: string | null }[]>;
  };
};

/**
 * Which of `urls` are still referenced by a saved row anywhere in the app.
 *
 * Every table that can hold a blob URL is covered: study sessions (image,
 * fileUrl), notes (image, fileUrl), users (avatar) and resources (url). Missing
 * any of these was the bug that let the nightly cleanup reap profile photos and
 * resource files. `excludeRowId` removes one row from the check, which is what
 * an edit wants: "is this file referenced by anything *other* than the row I am
 * updating?".
 */
export async function referencedUrls(
  db: Db,
  urls: (string | null | undefined)[],
  opts: { excludeRowId?: string } = {}
): Promise<Set<string>> {
  const candidates = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (candidates.length === 0) return new Set();

  const notRow = opts.excludeRowId ? { NOT: { id: opts.excludeRowId } } : {};
  const orRow = candidates.flatMap((u) => [{ image: u }, { fileUrl: u }]);

  const [sessions, notes, users, resources] = await Promise.all([
    db.studySession.findMany({
      where: { OR: orRow, ...notRow },
      select: { image: true, fileUrl: true },
    }),
    db.note.findMany({
      where: { OR: orRow, ...notRow },
      select: { image: true, fileUrl: true },
    }),
    db.user.findMany({
      where: { image: { in: candidates }, ...notRow },
      select: { image: true },
    }),
    db.resource.findMany({
      where: { url: { in: candidates }, ...notRow },
      select: { url: true },
    }),
  ]);

  const referenced = new Set<string>();
  for (const s of sessions) {
    if (s.image) referenced.add(s.image);
    if (s.fileUrl) referenced.add(s.fileUrl);
  }
  for (const n of notes) {
    if (n.image) referenced.add(n.image);
    if (n.fileUrl) referenced.add(n.fileUrl);
  }
  for (const u of users) if (u.image) referenced.add(u.image);
  for (const r of resources) if (r.url) referenced.add(r.url);

  return referenced;
}

/** Convenience: is this single URL still referenced by any saved row? */
export async function isReferenced(
  db: Db,
  url: string | null | undefined,
  opts: { excludeRowId?: string } = {}
): Promise<boolean> {
  const set = await referencedUrls(db, [url], opts);
  return set.size > 0;
}

/**
 * Mark uploads as attached to a saved row so the cleanup job stops considering
 * them orphans. Best-effort: a failure here just means the cleanup job will
 * double-check references before touching anything.
 */
export async function claimUploads(
  ownerId: string,
  urls: (string | null | undefined)[],
  client?: Db
) {
  const targets = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (targets.length === 0) return;
  const target = client ?? (await import("./db")).db;
  try {
    await target.upload.updateMany({
      where: { ownerId, url: { in: targets } },
      data: { claimedAt: new Date() },
    });
  } catch {
    // Ignore — the cleanup job checks references before deleting.
  }
}

/**
 * Verify that `url` was uploaded by `ownerId`.
 *
 * Attachments must be produced by our own upload route. Without this check a
 * member could paste any Blob URL on the host suffix into their note or profile
 * and later delete a file they never uploaded. Legacy URLs are handled by the
 * caller: an unchanged value on an existing row is allowed separately.
 */
export async function ownsUpload(
  ownerId: string,
  url: string | null | undefined,
  client?: Db
): Promise<boolean> {
  if (!url || !isBlobUrl(url)) return false;
  const target = client ?? (await import("./db")).db;
  const row = await target.upload.findFirst({
    where: { url, ownerId },
    select: { id: true },
  });
  return Boolean(row);
}

/**
 * Null when every newly submitted attachment was uploaded by `ownerId`.
 *
 * Each pair is [nextValue, currentValue]. A value that hasn't changed is always
 * allowed, so an admin editing someone else's note can keep the author's file
 * without re-uploading it.
 */
export async function attachmentError(
  ownerId: string,
  pairs: [next: string | null | undefined, current: string | null | undefined][],
  client?: Db
): Promise<string | null> {
  for (const [next, current] of pairs) {
    if (!next || next === current) continue;
    if (!(await ownsUpload(ownerId, next, client))) {
      return "Attach files with the upload button, not a link copied from somewhere else.";
    }
  }
  return null;
}

/**
 * Figure out which of `urls` are safe to delete.
 *
 * A URL is deleted when ALL of these hold:
 *  - it is a valid Blob URL;
 *  - when `requireOwnerId` is given, an `Upload` row records it with that owner;
 *  - no saved row (study session, note, user avatar, resource) still references
 *    it.
 *
 * Deletion is driven by "nothing references this anymore" rather than "the
 * actor owns it", so a file replaced by a different editor still gets cleaned
 * up. `requireOwnerId` remains available for the paths where ownership is a
 * safety requirement (e.g. one member must not delete a teammate's file).
 */
export async function deletableUrls(
  db: Db,
  ownerId: string | null,
  urls: (string | null | undefined)[],
  opts: {
    excludeRowId?: string;
    skipReferenceCheck?: boolean;
    requireOwnerId?: boolean;
  } = {}
): Promise<string[]> {
  const candidates = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (candidates.length === 0) return [];

  // Ownership gate (opt-in). When `ownerId` is provided we default to requiring
  // it, matching the original behaviour for user-facing delete actions.
  const mustOwn = opts.requireOwnerId ?? ownerId !== null;
  let owned: Set<string> | null = null;
  if (mustOwn && ownerId) {
    const rows = await db.upload.findMany({
      where: { url: { in: candidates } },
      select: { url: true, ownerId: true },
    });
    owned = new Set(rows.filter((r) => r.ownerId === ownerId).map((r) => r.url));
  }

  if (opts.skipReferenceCheck) {
    return candidates.filter((url) => !owned || owned.has(url));
  }

  const referenced = await referencedUrls(db, candidates, {
    excludeRowId: opts.excludeRowId,
  });
  return candidates.filter((url) => {
    if (owned && !owned.has(url)) return false;
    return !referenced.has(url);
  });
}
