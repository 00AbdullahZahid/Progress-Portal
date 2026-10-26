import Link from "next/link";
import { Card } from "./ui";
import { CalendarIcon, TasksIcon, ClassroomIcon } from "./icons";

export type UpNextClass = {
  title: string;
  location: string | null;
  day: string;
  time: string;
  color: string;
};

export type UpNextDeadline = {
  title: string;
  subject: string;
  when: string;
  days: number;
};

export type UpNextTask = {
  id: string;
  title: string;
  due: string | null;
  priority: string;
};

/**
 * The "what now?" strip. It sits directly under the greeting so the dashboard
 * answers the first question a member has instead of starting with charts.
 */
export function UpNext({
  nextClass,
  deadline,
  tasks,
  tasksDueToday,
}: {
  nextClass: UpNextClass | null;
  deadline: UpNextDeadline | null;
  tasks: UpNextTask[];
  tasksDueToday: number;
}) {
  return (
    <Card
      padded={false}
      className="mb-6 overflow-hidden border-brand/30 bg-gradient-to-br from-brand-soft/80 via-surface to-surface dark:from-brand-soft/30"
    >
      <div className="border-l-4 border-l-brand p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Up next</h2>
          <p className="text-xs font-medium text-muted">
            {tasksDueToday > 0
              ? `${tasksDueToday} task${tasksDueToday === 1 ? "" : "s"} due today`
              : "Nothing due today"}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            href="/timetable"
            className="tap min-w-0 rounded-xl border border-border bg-surface/85 p-3 hover:border-brand/40"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <ClassroomIcon width={13} height={13} className="text-brand" />
              Next class
            </p>
            {nextClass ? (
              <>
                <p className="mt-1 truncate font-semibold" title={nextClass.title}>
                  {nextClass.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {nextClass.day} · {nextClass.time}
                  {nextClass.location ? ` · ${nextClass.location}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">No classes scheduled.</p>
            )}
          </Link>

          <Link
            href="/exams"
            className="tap min-w-0 rounded-xl border border-border bg-surface/85 p-3 hover:border-brand/40"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <CalendarIcon width={13} height={13} className="text-brand" />
              Nearest deadline
            </p>
            {deadline ? (
              <>
                <p className="mt-1 truncate font-semibold" title={deadline.title}>
                  {deadline.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {deadline.subject} · {deadline.when}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted">Nothing due soon.</p>
            )}
          </Link>

          <Link
            href="/tasks"
            className="tap min-w-0 rounded-xl border border-border bg-surface/85 p-3 hover:border-brand/40"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <TasksIcon width={13} height={13} className="text-brand" />
              Open tasks
            </p>
            {tasks.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {tasks.slice(0, 2).map((task) => (
                  <li key={task.id} className="truncate text-sm font-semibold" title={task.title}>
                    {task.title}
                    {task.due ? (
                      <span className="ml-1 text-xs font-normal text-muted">· {task.due}</span>
                    ) : null}
                  </li>
                ))}
                {tasks.length > 2 ? (
                  <li className="text-xs text-muted">+{tasks.length - 2} more</li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">No open tasks assigned to you.</p>
            )}
          </Link>
        </div>
      </div>
    </Card>
  );
}
