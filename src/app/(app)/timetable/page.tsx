import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TimetableBoard } from "@/components/timetable-board";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const me = await requireUser();

  const entries = await db.timetableEntry.findMany({
    where: { ownerId: me.id },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Your weekly classes. Exams and deadlines live on the Deadlines page."
      />
      <TimetableBoard
        entries={entries.map((e) => ({
          id: e.id,
          weekday: e.weekday,
          startMin: e.startMin,
          endMin: e.endMin,
          title: e.title,
          location: e.location,
          color: e.color,
          ownerId: e.ownerId,
        }))}
        meId={me.id}
      />
    </div>
  );
}
