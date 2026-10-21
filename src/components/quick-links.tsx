import Link from "next/link";
import {
  TasksIcon,
  HabitsIcon,
  StudyIcon,
  ChatIcon,
  PeopleIcon,
} from "./icons";

const LINKS = [
  {
    href: "/tasks",
    label: "Tasks & Goals",
    hint: "Plan work and track progress",
    Icon: TasksIcon,
  },
  {
    href: "/habits",
    label: "Habits",
    hint: "Check in on daily routines",
    Icon: HabitsIcon,
  },
  {
    href: "/study",
    label: "Study log",
    hint: "Record focused sessions",
    Icon: StudyIcon,
  },
  {
    href: "/chat",
    label: "Chat",
    hint: "Talk with the group",
    Icon: ChatIcon,
  },
  {
    href: "/people",
    label: "People",
    hint: "See who is on the team",
    Icon: PeopleIcon,
  },
];

export function QuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {LINKS.map(({ href, label, hint, Icon }) => (
        <Link
          key={href}
          href={href}
          className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
        >
          <span className="text-brand">
            <Icon width={20} height={20} />
          </span>
          <span className="text-sm font-semibold leading-tight">{label}</span>
          <span className="text-xs text-muted">{hint}</span>
        </Link>
      ))}
    </div>
  );
}
