import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Mark one notification, or all of them, as read. */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { id?: unknown; all?: unknown } = {};
  try {
    body = (await request.json()) as { id?: unknown; all?: unknown };
  } catch {
    // An empty body is treated as "all" below.
  }

  if (body.all === true) {
    await db.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Notification not found." }, { status: 400 });
    await db.notification.updateMany({
      where: { id, userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const unread = await db.notification.count({
    where: { userId: me.id, readAt: null },
  });
  return NextResponse.json({ ok: true, unread });
}

/** Recent in-app notifications for the signed-in member. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);

  return NextResponse.json({
    unread,
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      href: item.href,
      read: item.readAt !== null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
