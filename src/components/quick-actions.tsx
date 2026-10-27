import Link from "next/link";
import { TimerIcon, StudyIcon, QuestionIcon, HabitsIcon } from "./icons";

const ACTIONS = [
  {
    href: "/study?timer=start",
    label: "Start timer",
    Icon: TimerIcon,
    primary: true,
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
    label: "Check in habits",
    Icon: HabitsIcon,
  },
];

/** The four things members do most often, available from the dashboard. */
export function QuickActions() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACTIONS.map(({ href, label, Icon, primary }) => (
        <Link
          key={href}
          href={href}
          className={`tap flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
            primary
              ? "border-brand bg-brand text-brand-ink hover:bg-brand/90"
              : "border-border bg-surface text-ink hover:border-brand/40 hover:bg-brand-soft"
          }`}
        >
          <span className={`shrink-0 ${primary ? "text-brand-ink" : "text-brand"}`}>
            <Icon width={17} height={17} />
          </span>
          <span className="truncate leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}
