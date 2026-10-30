import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { ListRow } from "@/components/list-row";
import {
  SearchIcon,
  NotesIcon,
  TasksIcon,
  ChatIcon,
  BookIcon,
  CalendarIcon,
  QuestionIcon,
  CardIcon,
  PeopleIcon,
} from "@/components/icons";

export const metadata = { title: "Search" };

function snippet(text: string, q: string, len = 140): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, len);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, start + len);
}

function Section({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: (props: { width?: number; height?: number; className?: string }) => React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Icon width={17} height={17} className="text-brand" /> {title}
      </h2>
      <ul className="flex flex-col divide-y divide-border">{children}</ul>
    </Card>
  );
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
        <PageHeader
          title="Search"
          subtitle="Find tasks, deadlines, notes, doubts, flashcards, resources, chat messages and people."
        />
        <Card className="p-6 text-sm text-muted">
          Type at least two characters in the search box above to look across the group.
        </Card>
      </div>
    );
  }

  const [notes, tasks, messages, resources, exams, questions, flashcards, people] =
    await Promise.all([
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
        include: {
          subject: { select: { name: true } },
          project: { select: { title: true } },
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      db.message.findMany({
        where: { body: { contains: query, mode: "insensitive" } },
        include: {
          author: { select: { name: true } },
          channel: { select: { name: true } },
        },
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
      db.exam.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        orderBy: { date: "asc" },
      }),
      db.question.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
            { body: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      db.flashcard.findMany({
        where: {
          OR: [
            { deck: { contains: query, mode: "insensitive" } },
            { front: { contains: query, mode: "insensitive" } },
            { back: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      db.user.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { handle: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 20,
        orderBy: { name: "asc" },
      }),
    ]);

  const total =
    notes.length +
    tasks.length +
    messages.length +
    resources.length +
    exams.length +
    questions.length +
    flashcards.length +
    people.length;

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
          {tasks.length > 0 ? (
            <Section title="Tasks" Icon={TasksIcon}>
              {tasks.map((t) => (
                <li key={t.id}>
                  <ListRow
                    href={`/tasks#task-${t.id}`}
                    title={t.title}
                    subtitle={`${t.subject?.name ?? "No subject"}${
                      t.project ? ` · ${t.project.title}` : ""
                    } · ${t.status}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {exams.length > 0 ? (
            <Section title="Deadlines" Icon={CalendarIcon}>
              {exams.map((e) => (
                <li key={e.id}>
                  <ListRow
                    href="/exams"
                    title={e.title}
                    subtitle={`${e.subject} · ${e.date}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {notes.length > 0 ? (
            <Section title="Notes" Icon={NotesIcon}>
              {notes.map((n) => (
                <li key={n.id}>
                  <ListRow
                    href="/notes"
                    title={n.title}
                    subtitle={snippet(n.body, query)}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {questions.length > 0 ? (
            <Section title="Doubts" Icon={QuestionIcon}>
              {questions.map((q) => (
                <li key={q.id}>
                  <ListRow
                    href={`/questions#question-${q.id}`}
                    title={q.title}
                    subtitle={`${q.subject} · ${snippet(q.body, query, 100)}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {flashcards.length > 0 ? (
            <Section title="Flashcards" Icon={CardIcon}>
              {flashcards.map((c) => (
                <li key={c.id}>
                  <ListRow
                    href="/flashcards"
                    title={c.front}
                    subtitle={`${c.deck} · ${snippet(c.back, query, 100)}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {resources.length > 0 ? (
            <Section title="Resources" Icon={BookIcon}>
              {resources.map((r) => (
                <li key={r.id}>
                  <ListRow
                    href="/resources"
                    title={r.title}
                    subtitle={`${r.subject} · ${r.kind}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {messages.length > 0 ? (
            <Section title="Chat" Icon={ChatIcon}>
              {messages.map((m) => (
                <li key={m.id}>
                  <ListRow
                    href="/chat"
                    title={`${m.author.name} in #${m.channel.name}`}
                    subtitle={snippet(m.body, query)}
                  />
                </li>
              ))}
            </Section>
          ) : null}

          {people.length > 0 ? (
            <Section title="People" Icon={PeopleIcon}>
              {people.map((p) => (
                <li key={p.id}>
                  <ListRow
                    href="/people"
                    title={p.name}
                    subtitle={`@${p.handle}`}
                  />
                </li>
              ))}
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}
