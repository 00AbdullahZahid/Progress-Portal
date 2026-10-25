import Link from "next/link";
import { TimerIcon, StudyIcon, QuestionIcon, HabitsIcon } from "./icons";

const ACTIONS = [
  {
    href: "/study?timer=start",
    label: "Start timer",
    Icon: TimerIcon,
  },
  {
    href: "/study#log-session",
    label: "Quick log study",
    Icon: StudyIcon,
  },
  {
    href: "/questions?new=1",
    label: "Ask a doubt",
    Icon: QuestionIcon,
  },
  {
    href: "/habits",
    label: "Check in",
    Icon: HabitsIcon,
  },
];

/** The four things members do most often, available from the dashboard. */
export function QuickActions() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACTIONS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-soft"
        >
          <span className="shrink-0 text-brand">
            <Icon width={17} height={17} />
          </span>
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </div>
  );
}
