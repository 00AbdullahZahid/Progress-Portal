import { NextResponse } from "next/server";
import { buildDigest, sendDigest } from "@/lib/notify";
import { cronAuthorized } from "@/lib/cron";

export const runtime = "nodejs";

/**
 * Daily notification digest. Vercel Cron hits this with
 * `Authorization: Bearer <CRON_SECRET>`; the secret is never accepted from the
 * query string. When NOTIFY_WEBHOOK_URL is unset the digest is simply not sent.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
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
