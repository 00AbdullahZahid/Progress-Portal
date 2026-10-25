import { NextResponse } from "next/server";
import { buildDigest, sendDigest } from "@/lib/notify";
import { buildDueNotifications } from "@/lib/notifications";
import { cronAuthorized } from "@/lib/cron";

export const runtime = "nodejs";

/**
 * Daily notification job. Vercel Cron hits this with
 * `Authorization: Bearer <CRON_SECRET>`; the secret is never accepted from the
 * query string.
 *
 * The webhook digest is optional. In-app due/overdue reminders are generated
 * even when no group webhook is configured.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let digest: { sent: boolean; error?: string; members?: number; skipped?: string } = {
    sent: false,
    skipped: "notifications not configured",
  };

  if (process.env.NOTIFY_WEBHOOK_URL) {
    const { text, items } = await buildDigest();
    const result = await sendDigest(text);
    digest = { sent: result.ok, error: result.error, members: items.length };
  }

  const due = await buildDueNotifications();
  // A failed optional webhook should surface to Cron without discarding the
  // in-app reminders that were just generated.
  const status = process.env.NOTIFY_WEBHOOK_URL && !digest.sent ? 502 : 200;
  return NextResponse.json({ digest, due, status }, { status });
}
