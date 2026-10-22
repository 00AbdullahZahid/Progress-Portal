/**
 * Shared rules for what files the app accepts. Kept out of the route so the
 * validation logic can be reused (and reasoned about) in one place.
 */

// Vercel's request body limit is ~4.5MB, and multipart adds overhead on top of
// the file bytes, so cap files below that to stay safely under the limit.
export const MAX_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

// Allowed types, each with the file extensions we accept for it. SVG and HTML
// are deliberately excluded: they can execute script when served. A Map (not a
// plain object) so a crafted `file.type` like "constructor" or "__proto__"
// can't resolve to an inherited value.
export const ALLOWED_TYPES = new Map<string, string[]>([
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/webp", ["webp"]],
  ["image/gif", ["gif"]],
  ["application/pdf", ["pdf"]],
  ["text/plain", ["txt"]],
  ["application/msword", ["doc"]],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ["docx"],
  ],
  ["application/vnd.ms-excel", ["xls"]],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ["xlsx"],
  ],
]);

export const IMAGE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** The lowercased extension without the dot, or "" when there is none. */
export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return "";
  return base.slice(dot + 1).toLowerCase();
}

/** Only letters, numbers, dot, dash and underscore in the stored name. */
export function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "file";
}

/**
 * Check the first bytes of the file against its declared type. A cheap defense
 * against a renamed executable or an HTML page posing as an image; the browser's
 * `file.type` alone can't be trusted.
 */
export async function hasValidSignature(
  file: File,
  mime: string
): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const match = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);

  switch (mime) {
    case "image/png":
      return match(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg":
      return match(0xff, 0xd8, 0xff);
    case "image/gif":
      // "GIF87a" or "GIF89a"
      return (
        match(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) ||
        match(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
      );
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        match(0x52, 0x49, 0x46, 0x46) &&
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50
      );
    case "application/pdf":
      return match(0x25, 0x50, 0x44, 0x46); // "%PDF"
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      // Modern Office files are ZIP archives.
      return match(0x50, 0x4b, 0x03, 0x04);
    case "application/msword":
    case "application/vnd.ms-excel":
      // Legacy Office files use the OLE compound-file header.
      return match(0xd0, 0xcf, 0x11, 0xe0);
    default:
      // text/plain has no reliable signature.
      return true;
  }
}
