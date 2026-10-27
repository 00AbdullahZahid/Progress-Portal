import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatWindow } from "@/components/chat-window";
import { ChatReadMarker } from "@/components/chat-read-marker";
import { publicUserSelect } from "@/lib/user";

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
      ? (async () => {
          const recent = await db.message.findMany({
            where: { channelId: active.id },
            include: { author: { select: publicUserSelect } },
            orderBy: { createdAt: "desc" },
            take: 200,
          });
          return recent.reverse();
        })()
      : Promise.resolve([]),
    db.user.findMany({
      orderBy: { name: "asc" },
      select: publicUserSelect,
    }),
  ]);

  return (
    <div>
      <ChatReadMarker />
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
            image: m.author.image,
          },
        }))}
        members={members.map((u) => ({
          id: u.id,
          name: u.name,
          color: u.color,
          image: u.image,
        }))}
        meId={me.id}
        meHandle={me.handle}
        isAdmin={me.role === "admin"}
        tz={me.timezone}
      />
    </div>
  );
}
