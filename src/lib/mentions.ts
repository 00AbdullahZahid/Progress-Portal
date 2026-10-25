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
