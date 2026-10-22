import { del } from "@vercel/blob";
import { isBlobUrl } from "./validation";

/**
 * Best-effort deletion of blobs we no longer reference.
 *
 * Blob cleanup must never break the main action, so every failure (missing
 * token, already-deleted file, network hiccup) is swallowed. Only URLs that are
 * valid Blob URLs are sent to `del`, so a stale non-Blob value can't cause a
 * request to an arbitrary host.
 *
 * Ownership is NOT checked here — callers are responsible for proving the actor
 * owns the file (see `deletableUrls`) before passing URLs in. Use the
 * `deleteOwnedBlobs` helper in actions to get that check for free.
 */
export async function deleteBlobs(urls: (string | null | undefined)[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  const targets = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (targets.length === 0) return;

  try {
    await del(targets);
  } catch {
    // Ignore — orphaned blobs are preferable to a failed user action.
  }
}

type Db = {
  upload: {
    findMany: (args: {
      where: { url: { in: string[] } };
      select: { url: true; ownerId: true };
    }) => Promise<{ url: string; ownerId: string }[]>;
  };
  studySession: {
    count: (args: {
      where: {
        OR: { image?: string; fileUrl?: string }[];
        NOT?: { id: string };
      };
    }) => Promise<number>;
  };
  note: {
    count: (args: {
      where: {
        OR: { image?: string; fileUrl?: string }[];
        NOT?: { id: string };
      };
    }) => Promise<number>;
  };
};

/**
 * Figure out which of `urls` are safe to delete on behalf of `ownerId`.
 *
 * A URL is deleted only when ALL of these hold:
 *  - it is a valid Blob URL;
 *  - an `Upload` row records it with `ownerId` as the owner;
 *  - no other saved row (study session, note) still references it.
 *
 * This stops one member from deleting a teammate's file by pasting that file's
 * URL into one of their own rows and then deleting it.
 */
export async function deletableUrls(
  db: Db,
  ownerId: string,
  urls: (string | null | undefined)[],
  opts: { excludeRowId?: string; skipReferenceCheck?: boolean } = {}
): Promise<string[]> {
  const candidates = [
    ...new Set(urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u))),
  ];
  if (candidates.length === 0) return [];

  const owned = await db.upload.findMany({
    where: { url: { in: candidates } },
    select: { url: true, ownerId: true },
  });
  const ownedByMe = new Set(
    owned.filter((u) => u.ownerId === ownerId).map((u) => u.url)
  );

  const safe: string[] = [];
  for (const url of candidates) {
    if (!ownedByMe.has(url)) continue;
    // When the owning user is being deleted, every row that references the file
    // is being removed with them, so no reference check is needed.
    if (opts.skipReferenceCheck) {
      safe.push(url);
      continue;
    }

    const where = {
      OR: [{ image: url }, { fileUrl: url }],
      ...(opts.excludeRowId ? { NOT: { id: opts.excludeRowId } } : {}),
    };
    const [sessionRefs, noteRefs] = await Promise.all([
      db.studySession.count({ where }),
      db.note.count({ where }),
    ]);
    if (sessionRefs === 0 && noteRefs === 0) safe.push(url);
  }
  return safe;
}
