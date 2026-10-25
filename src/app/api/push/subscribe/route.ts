import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type SubscriptionBody = {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
};

/**
 * Browser push services. Restricting the endpoint host keeps the server from
 * being used to POST to an arbitrary URL supplied by a signed-in member.
 */
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
  "wns.windows.com",
];

function isPushHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function readSubscription(body: SubscriptionBody) {
  const endpoint = clean(body.endpoint, 2048);
  const p256dh = clean(body.keys?.p256dh, 512);
  const auth = clean(body.keys?.auth, 256);
  if (!endpoint || !p256dh || !auth) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!isPushHost(url.hostname)) return null;
  } catch {
    return null;
  }
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: SubscriptionBody;
  try {
    body = (await request.json()) as SubscriptionBody;
  } catch {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const subscription = readSubscription(body);
  if (!subscription) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      userId: me.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    update: {
      userId: me.id,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let endpoint = "";
  try {
    const body = (await request.json()) as { endpoint?: unknown };
    endpoint = clean(body.endpoint, 2048) ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }
  if (!endpoint) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({ where: { endpoint, userId: me.id } });
  return NextResponse.json({ ok: true });
}
