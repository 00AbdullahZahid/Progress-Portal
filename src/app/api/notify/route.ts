import { NextResponse } from "next/server";
import { buildDigest, sendDigest } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * Daily notification digest. Vercel Cron hits this with the CRON_SECRET as a
 * bearer token; a manual run can pass ?key=<CRON_SECRET>. When
 * NOTIFY_WEBHOOK_URL is unset the digest is simply not sent (no error).
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  if (secret && url.searchParams.get("key") === secret) return true;
  return !secret && process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { text, items } = await buildDigest();
  if (!process.env.NOTIFY_WEBHOOK_URL) {
    return NextResponse.json({ skipped: "notifications not configured", members: items.length });
  }

  const result = await sendDigest(text);
  return NextResponse.json(
    { sent: result.ok, error: result.error, members: items.length },
    { status: result.ok ? 200 : 502 }
  );
}
