import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { TimetableBoard } from "@/components/timetable-board";

export const metadata = { title: "Timetable" };

export default async function TimetablePage() {
  const me = await requireUser();

  // Everyone sees the shared timetable plus their own personal classes.
  const entries = await db.timetableEntry.findMany({
    where: { OR: [{ scope: "group" }, { ownerId: me.id }] },
    orderBy: [{ weekday: "asc" }, { startMin: "asc" }],
    include: { owner: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Shared weekly calendar for the group, plus personal classes only you can see."
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
          scope: e.scope,
          ownerId: e.ownerId,
          ownerName: e.owner.name,
        }))}
        isAdmin={me.role === "admin"}
        meId={me.id}
      />
    </div>
  );
}
