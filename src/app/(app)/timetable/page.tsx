import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TimetableBoard } from "@/components/timetable-board";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const me = await requireUser();

  // The timetable belongs to the whole group: every member sees the same
  // schedule, and only admins can add or remove classes.
  const entries = await db.timetableEntry.findMany({
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    include: { owner: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Shared weekly calendar for the whole group. Only admins can add or remove classes."
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
          ownerName: e.owner.name,
        }))}
        isAdmin={me.role === "admin"}
      />
    </div>
  );
}
