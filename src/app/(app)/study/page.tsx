import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { lastNDays, prettyDate } from "@/lib/dates";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { StudyForm } from "@/components/study-form";
import { Avatar } from "@/components/avatar";
import { TargetIcon, ClockIcon, StudyIcon, XIcon } from "@/components/icons";

export default async function StudyPage() {
  const me = await requireUser();
  const last30 = lastNDays(me.timezone, 30);

  const sessions = await db.studySession.findMany({
    where: { date: { gte: last30[0] } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
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
          <StudyForm />
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
              <ul className="flex flex-col divide-y divide-border">
                {sessions.slice(0, 20).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <Avatar user={s.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {s.subject}
                        {s.userId === me.id ? null : (
                          <span className="ml-1 text-xs text-muted">by {s.user.name}</span>
                        )}
                      </p>
                      {s.notes ? (
                        <p className="truncate text-xs text-muted">{s.notes}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted">{prettyDate(s.date)}</span>
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                      {Math.round(s.minutes / 6) / 10}h
                    </span>
                    {s.userId === me.id ? (
                      <form action={deleteSessionAction}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button className="text-xs text-muted hover:text-rose-600">
                          <XIcon width={16} height={16} />
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

import { deleteStudySession } from "@/lib/actions/study";

async function deleteSessionAction(formData: FormData) {
  "use server";
  await deleteStudySession(formData);
}
