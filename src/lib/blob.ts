import { del } from "@vercel/blob";

/**
 * Best-effort deletion of blobs we no longer reference.
 *
 * Called when a user replaces an avatar or attachment, deletes a study session,
 * or an admin deletes a user. Blob cleanup must never break the main action, so
 * every failure (missing token, already-deleted file, network hiccup) is
 * swallowed. Only URLs that pass `isBlobUrl` are sent to `del`, so a stale
 * non-Blob value can't cause a request to an arbitrary host.
 */
export async function deleteBlobs(urls: (string | null | undefined)[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;

  // De-duplicate and drop anything that isn't ours.
  const targets = [
    ...new Set(
      urls.filter(
        (u): u is string => typeof u === "string" && isBlobUrlSafe(u)
      )
    ),
  ];
  if (targets.length === 0) return;

  try {
    await del(targets);
  } catch {
    // Ignore — orphaned blobs are preferable to a failed user action.
  }
}

/** Kept local to avoid importing the whole validation module into actions. */
function isBlobUrlSafe(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}
