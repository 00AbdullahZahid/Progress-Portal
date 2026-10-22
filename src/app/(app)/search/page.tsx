import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { SearchIcon, NotesIcon, TasksIcon, ChatIcon, BookIcon } from "@/components/icons";

export const metadata = { title: "Search" };

function snippet(text: string, q: string, len = 140): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, len);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + len);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (query.length < 2) {
    return (
      <div>
        <PageHeader title="Search" subtitle="Find notes, tasks, chat messages and resources." />
        <Card className="p-6 text-sm text-muted">
          Type at least two characters in the search box above to look across the group.
        </Card>
      </div>
    );
  }

  const [notes, tasks, messages, resources] = await Promise.all([
    db.note.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
          { subject: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    db.task.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      include: { project: { select: { name: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    db.message.findMany({
      where: { body: { contains: query, mode: "insensitive" } },
      include: { author: { select: { name: true } }, channel: { select: { name: true } } },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    db.resource.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { subject: { contains: query, mode: "insensitive" } },
          { note: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const total = notes.length + tasks.length + messages.length + resources.length;

  return (
    <div>
      <PageHeader
        title={`Search: ${query}`}
        subtitle={`${total} result${total === 1 ? "" : "s"} across the group.`}
      />

      {total === 0 ? (
        <EmptyState icon={<SearchIcon />} title="No matches" hint="Try a different word." />
      ) : (
        <div className="flex flex-col gap-4">
          {notes.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <NotesIcon width={17} height={17} className="text-brand" /> Notes
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {notes.map((n) => (
                  <li key={n.id} className="py-2">
                    <Link href="/notes" className="text-sm font-medium text-brand hover:underline">
                      {n.title}
                    </Link>
                    <p className="text-xs text-muted">{snippet(n.body, query)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {tasks.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <TasksIcon width={17} height={17} className="text-brand" /> Tasks
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {tasks.map((t) => (
                  <li key={t.id} className="py-2">
                    <Link href="/tasks" className="text-sm font-medium text-brand hover:underline">
                      {t.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {t.project.name} · {t.status}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {messages.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <ChatIcon width={17} height={17} className="text-brand" /> Chat
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {messages.map((m) => (
                  <li key={m.id} className="py-2">
                    <p className="text-xs text-muted">
                      {m.author.name} in #{m.channel.name}
                    </p>
                    <p className="text-sm">{snippet(m.body, query)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {resources.length > 0 ? (
            <Card className="p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <BookIcon width={17} height={17} className="text-brand" /> Resources
              </h2>
              <ul className="flex flex-col divide-y divide-border">
                {resources.map((r) => (
                  <li key={r.id} className="py-2">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        {r.title}
                      </a>
                    ) : (
                      <span className="text-sm font-medium">{r.title}</span>
                    )}
                    <p className="text-xs text-muted">
                      {r.subject} · {r.kind}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
