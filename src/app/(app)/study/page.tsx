import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, todayStr } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StudyForm } from "@/components/study-form";
import { SessionList } from "@/components/session-list";
import { TargetIcon, ClockIcon, StudyIcon } from "@/components/icons";

export default async function StudyPage() {
  const me = await requireUser();
  const today = todayStr(me.timezone);
  const last30 = lastNDays(me.timezone, 30);

  // Your own sessions (always) plus other people's sessions they've shared.
  const sessions = await db.studySession.findMany({
    where: {
      date: { gte: last30[0] },
      OR: [{ userId: me.id }, { shared: true }],
    },
    include: { user: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const myTotal = sessions
    .filter((s) => s.userId === me.id)
    .reduce((a, s) => a + s.minutes, 0);
  const groupTotal = sessions.reduce((a, s) => a + s.minutes, 0);
  const bySubject = sessions
    .filter((s) => s.userId === me.id)
    .reduce<Record<string, number>>((acc, s) => {
      acc[s.subject] = (acc[s.subject] ?? 0) + s.minutes;
      return acc;
    }, {});
  const subjectRows = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);
  const maxSubject = Math.max(1, ...subjectRows.map(([, v]) => v));

  return (
    <div>
      <PageHeader
        title="Study log"
        subtitle={`You: ${Math.round(myTotal / 6) / 10}h · Group: ${Math.round(groupTotal / 6) / 10}h in the last 30 days.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <StudyForm today={today} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
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
                sessions={sessions.slice(0, 50).map((s) => ({
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
