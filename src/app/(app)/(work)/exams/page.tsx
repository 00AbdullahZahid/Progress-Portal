import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { todayStr } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { ExamsBoard } from "@/components/exams-board";

export const metadata = { title: "Deadlines" };

export default async function ExamsPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);

  const [exams, subjects] = await Promise.all([
    db.exam.findMany({
      include: { createdBy: { select: { id: true, name: true, color: true, image: true } } },
      orderBy: { date: "asc" },
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
        title="Deadlines & exams"
        subtitle="A shared countdown of exams, quizzes and assignments."
      />
      <ExamsBoard
        exams={exams.map((e) => ({
          id: e.id,
          title: e.title,
          subject: e.subject,
          subjectId: e.subjectId,
          kind: e.kind,
          date: e.date,
          notes: e.notes,
          createdById: e.createdById,
          createdBy: e.createdBy,
        }))}
        subjects={subjects}
        meId={me.id}
        isAdmin={me.role === "admin"}
        today={today}
      />
    </div>
  );
}
