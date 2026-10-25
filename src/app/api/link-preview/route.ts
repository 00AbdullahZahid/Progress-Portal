import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 320_000;
const MAX_REDIRECTS = 3;

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIpv4(mapped[1]) : false;
  }
  return true;
}

async function hostIsPublic(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    return false;
  }

  if (isIP(host)) return !isPrivateAddress(host);

  try {
    const records = await lookup(host, { all: true, verbatim: true });
    return records.length > 0 && records.every((record) => !isPrivateAddress(record.address));
  } catch {
    return false;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const value = Number.parseInt(code, 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    })
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number.parseInt(code, 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    });
}

function clean(value: string | undefined, max: number): string {
  if (!value) return "";
  return decodeEntities(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return match?.[1];
}

function metaContent(html: string, key: string): string | undefined {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const property = attribute(tag, "property") ?? attribute(tag, "name");
    if (property?.toLowerCase() === key) return attribute(tag, "content");
  }
  return undefined;
}

function findTitle(html: string): string {
  const og = clean(metaContent(html, "og:title") ?? metaContent(html, "twitter:title"), 160);
  if (og) return og;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return clean(title, 160);
}

function findDescription(html: string): string {
  return clean(
    metaContent(html, "og:description") ?? metaContent(html, "description"),
    300
  );
}

function findIcon(html: string, current: URL): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attribute(tag, "rel")?.toLowerCase() ?? "";
    if (!rel.split(/\s+/).includes("icon")) continue;
    const href = attribute(tag, "href");
    if (!href) continue;
    try {
      const icon = new URL(href, current);
      if (icon.protocol === "http:" || icon.protocol === "https:") return icon.toString();
    } catch {}
  }
  try {
    return new URL("/favicon.ico", current.origin).toString();
  } catch {
    return null;
  }
}

async function readLimited(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      const remaining = MAX_BYTES - size;
      chunks.push(value.byteLength > remaining ? value.slice(0, remaining) : value);
      size += Math.min(value.byteLength, remaining);
    }
  }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

/** Fetch minimal Open Graph metadata for a link. Auth + SSRF guarded. */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const limit = rateLimit(`link-preview:${me.id}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many link previews. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const raw = new URL(request.url).searchParams.get("url") ?? "";
  let current: URL;
  try {
    current = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Enter a valid link." }, { status: 400 });
  }
  if (
    (current.protocol !== "http:" && current.protocol !== "https:") ||
    current.username ||
    current.password
  ) {
    return NextResponse.json({ error: "Only public http(s) links are supported." }, { status: 400 });
  }

  let response: Response | null = null;
  for (let step = 0; step <= MAX_REDIRECTS; step += 1) {
    if (!(await hostIsPublic(current.hostname))) {
      return NextResponse.json(
        { error: "That link points to a private address." },
        { status: 400 }
      );
    }

    let next: Response;
    try {
      next = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "GroupPortalLinkPreview/1.0",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Could not reach that link." },
        { status: 422 }
      );
    }

    if (next.status >= 300 && next.status < 400) {
      const location = next.headers.get("location");
      if (!location) break;
      try {
        current = new URL(location, current);
      } catch {
        break;
      }
      if (
        (current.protocol !== "http:" && current.protocol !== "https:") ||
        current.username ||
        current.password
      ) {
        return NextResponse.json(
          { error: "That link redirects somewhere unsafe." },
          { status: 400 }
        );
      }
      continue;
    }

    response = next;
    break;
  }

  if (!response || !response.ok) {
    return NextResponse.json(
      { error: "That link could not be read." },
      { status: 422 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("text/html")) {
    return NextResponse.json(
      { error: "That link is not a web page." },
      { status: 415 }
    );
  }

  const html = await readLimited(response);
  const title = findTitle(html) || current.hostname.replace(/^www\./, "");
  const description = findDescription(html);
  const siteName = clean(metaContent(html, "og:site_name"), 80);
  const favicon = findIcon(html, current);
  const ogType = (metaContent(html, "og:type") ?? "").toLowerCase();
  const isVideo =
    ogType.startsWith("video") ||
    /(?:youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)$/i.test(current.hostname);
  const looksLikePaper = /past\s*paper/i.test(title);

  return NextResponse.json({
    url: current.toString(),
    title,
    description,
    siteName,
    favicon,
    kind: isVideo ? "video" : looksLikePaper ? "paper" : "link",
  });
}
