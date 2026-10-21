import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatWindow } from "@/components/chat-window";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ ch?: string }>;
}) {
  const me = await requireUser();
  const { ch } = await searchParams;

  let channels = await db.channel.findMany({
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });

  // Guarantee at least one channel so chat is never a dead end.
  if (channels.length === 0) {
    const created = await db.channel.create({
      data: { name: "General", kind: "group" },
    });
    channels = [created];
  }

  const active = channels.find((c) => c.id === ch) ?? channels[0];

  const [messages, members] = await Promise.all([
    active
      ? db.message.findMany({
          where: { channelId: active.id },
          include: { author: true },
          orderBy: { createdAt: "asc" },
          take: 200,
        })
      : Promise.resolve([]),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Chat" subtitle="Group conversation, updates, and hype." />
      <ChatWindow
        channels={channels.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        activeId={active?.id ?? ""}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          author: {
            id: m.author.id,
            name: m.author.name,
            color: m.author.color,
          },
        }))}
        members={members.map((u) => ({
          id: u.id,
          name: u.name,
          color: u.color,
        }))}
        meId={me.id}
        isAdmin={me.role === "admin"}
        tz={me.timezone}
      />
    </div>
  );
}
