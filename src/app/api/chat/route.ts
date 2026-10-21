import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId") ?? "";
  const after = searchParams.get("after") ?? "";

  if (!channelId) {
    return NextResponse.json({ error: "missing channelId" }, { status: 400 });
  }

  const messages = await db.message.findMany({
    where: {
      channelId,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    include: { author: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      author: {
        id: m.author.id,
        name: m.author.name,
        color: m.author.color,
      },
    })),
  });
}
