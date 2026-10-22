import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * Poll endpoint for the chat window.
 *
 * Query params:
 *   channelId - required
 *   after     - ISO timestamp; only messages created after this are returned.
 *               A malformed value yields 400 rather than a Prisma 500.
 *   full      - "1" to return the latest window regardless of `after`
 *               (used to reconcile edits and deletes).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId") ?? "";
  const after = searchParams.get("after") ?? "";
  const full = searchParams.get("full") === "1";

  if (!channelId) {
    return NextResponse.json({ error: "missing channelId" }, { status: 400 });
  }

  // Validate `after` up front so a bad value can't reach Prisma.
  let afterDate: Date | null = null;
  if (after) {
    afterDate = new Date(after);
    if (Number.isNaN(afterDate.getTime())) {
      return NextResponse.json({ error: "invalid after" }, { status: 400 });
    }
  }

  // A full sync returns the most recent messages (newest last) so the client
  // can reconcile edits and deletes made by other people.
  if (full) {
    const recent = await db.message.findMany({
      where: { channelId },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    recent.reverse();
    return NextResponse.json({ messages: recent.map(serialize) });
  }

  const messages = await db.message.findMany({
    where: {
      channelId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages: messages.map(serialize) });
}

type MessageWithAuthor = {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; color: string; image: string | null };
};

function serialize(m: MessageWithAuthor) {
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    author: {
      id: m.author.id,
      name: m.author.name,
      color: m.author.color,
      image: m.author.image,
    },
  };
}
