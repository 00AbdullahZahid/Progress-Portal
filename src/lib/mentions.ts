export type MentionToken = { start: number; end: number; query: string };

/**
 * The @mention token being typed at `caret`, or null when the caret is not in
 * one. `end` includes any handle characters after the caret, so choosing a
 * member replaces the whole token instead of leaving a duplicate suffix.
 *
 * Uses the same boundary as `mentionedHandles` below, so an email like
 * `a@b.com` never opens the picker.
 */
export function mentionTokenAt(text: string, caret: number): MentionToken | null {
  if (!Number.isInteger(caret) || caret < 0 || caret > text.length) return null;

  const before = text.slice(0, caret);
  const match = /(^|[^a-z0-9_])@([a-z0-9_]{0,20})$/i.exec(before);
  if (!match) return null;

  const start = match.index + match[1].length;
  const query = match[2].toLowerCase();
  const suffix = /^[a-z0-9_]*/i.exec(text.slice(caret))?.[0] ?? "";
  return { start, end: caret + suffix.length, query };
}

/** Extract unique @handles from a message, excluding the author's own handle. */
export function mentionedHandles(body: string, ownHandle: string): string[] {
  const found = new Set<string>();
  const re = /(^|[^a-z0-9_])@([a-z0-9_]{2,20})\b/gi;
  for (const match of body.matchAll(re)) {
    const handle = match[2].toLowerCase();
    if (handle !== ownHandle.toLowerCase()) found.add(handle);
  }
  return [...found].slice(0, 8);
}
