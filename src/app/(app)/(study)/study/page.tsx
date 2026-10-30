import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StudyForm } from "@/components/study-form";
import { SessionList } from "@/components/session-list";
import { StudyNotesPanel } from "@/components/study-notes-panel";
import { FocusTimer } from "@/components/focus-timer";
import { publicUserSelect } from "@/lib/user";
import { TargetIcon, ClockIcon, StudyIcon } from "@/components/icons";

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ timer?: string }>;
}) {
  const me = await requireUser();
  const sp = await searchParams;
  const autoStart = sp?.timer === "start";
  const today = todayStr(me.timezone);
  const last30 = lastNDays(me.timezone, 30);

  // Your own sessions (always) plus other people's sessions they've shared.
  const sessions = await db.studySession.findMany({
    where: {
      date: { gte: last30[0] },
      OR: [{ userId: me.id }, { shared: true }],
    },
    include: {
      user: { select: publicUserSelect },
      task: { select: { id: true, title: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  // The list is capped, but every number below is computed from separate
  // aggregates over the FULL window so a busy group can't undercount them.
  const window = { date: { gte: last30[0] } };

  const [groupAgg, myAgg, myBySubject, recentNotes, activeTasks] = await Promise.all([
    // Group total: everyone's shared sessions plus your own private ones.
    // Private sessions never contribute to another member's view.
    db.studySession.aggregate({
      where: { ...window, OR: [{ shared: true }, { userId: me.id }] },
      _sum: { minutes: true },
    }),
    // Your own total, independent of the list cap or other people's sessions.
    db.studySession.aggregate({
      where: { ...window, userId: me.id },
      _sum: { minutes: true },
    }),
    db.studySession.groupBy({
      by: ["subject"],
      where: { ...window, userId: me.id },
      _sum: { minutes: true },
    }),
    // A short preview of the shared notes so study material is one click away.
    db.note.findMany({
      include: { author: { select: { id: true, name: true, color: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Open tasks the signed-in member can link a focus block to.
    db.task.findMany({
      where: {
        assignees: { some: { userId: me.id } },
        status: { not: "done" },
      },
      select: {
        id: true,
        title: true,
        subject: { select: { name: true } },
        project: { select: { title: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 50,
    }),
  ]);

  const myTotal = myAgg._sum.minutes ?? 0;
  const groupTotal = groupAgg._sum.minutes ?? 0;
  const subjectRows = myBySubject
    .map((r) => [r.subject, r._sum.minutes ?? 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const maxSubject = Math.max(1, ...subjectRows.map(([, v]) => v));

  return (
    <div>
      <PageHeader
        title="Study log"
        subtitle={`You: ${Math.round(myTotal / 6) / 10}h · Group: ${Math.round(groupTotal / 6) / 10}h in the last 30 days.`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-1">
          <FocusTimer
            tasks={activeTasks.map((t) => ({
              id: t.id,
              title: t.title,
              projectName: t.project?.title ?? t.subject?.name ?? "No subject",
            }))}
            autoStart={autoStart}
          />
          <div id="log-session" className="scroll-mt-24">
            <StudyForm today={today} />
          </div>
          <StudyNotesPanel
            meId={me.id}
            notes={recentNotes.map((n) => ({
              id: n.id,
              title: n.title,
              subject: n.subject,
              authorName: n.author.name,
              authorId: n.authorId,
            }))}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TargetIcon width={18} height={18} className="text-brand" />
              Your subjects
            </h2>
            {subjectRows.length === 0 ? (
              <p className="text-sm text-muted">Log a session to see your subject breakdown.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {subjectRows.map(([subject, mins]) => (
                  <div key={subject}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{subject}</span>
                      <span className="text-muted">
                        {Math.round(mins / 6) / 10}h
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(mins / maxSubject) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ClockIcon width={18} height={18} className="text-brand" />
              Recent sessions
            </h2>
            {sessions.length === 0 ? (
              <EmptyState icon={<StudyIcon />} title="No sessions logged" hint="Log your first study session on the left." />
            ) : (
              <SessionList
                sessions={sessions.map((s) => ({
                  id: s.id,
                  subject: s.subject,
                  minutes: s.minutes,
                  notes: s.notes,
                  date: s.date,
                  userId: s.userId,
                  user: {
                    id: s.user.id,
                    name: s.user.name,
                    color: s.user.color,
                    image: s.user.image,
                  },
                  image: s.image,
                  fileUrl: s.fileUrl,
                  fileName: s.fileName,
                  shared: s.shared,
                  task: s.task,
                }))}
                meId={me.id}
                today={today}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
