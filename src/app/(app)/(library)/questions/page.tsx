import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { QuestionsBoard } from "@/components/questions-board";

export const metadata = { title: "Doubts" };

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;

  const [questions, subjects] = await Promise.all([
    db.question.findMany({
      include: {
        author: { select: { id: true, name: true, color: true, image: true } },
        answers: {
          include: { author: { select: { id: true, name: true, color: true, image: true } } },
          orderBy: [{ accepted: "desc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, archivedAt: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Doubts"
        subtitle="Ask per subject and get lasting answers, with one marked accepted."
      />
      <QuestionsBoard
        questions={questions.map((q) => ({
          id: q.id,
          subject: q.subject,
          subjectId: q.subjectId,
          title: q.title,
          body: q.body,
          authorId: q.authorId,
          author: q.author,
          answers: q.answers.map((a) => ({
            id: a.id,
            body: a.body,
            accepted: a.accepted,
            authorId: a.authorId,
            author: a.author,
          })),
        }))}
        meId={me.id}
        isAdmin={me.role === "admin"}
        subjects={subjects}
        initialCreating={sp?.new === "1"}
      />
    </div>
  );
}
