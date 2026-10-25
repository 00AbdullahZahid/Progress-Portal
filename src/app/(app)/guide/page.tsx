import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import {
  DashboardIcon,
  TasksIcon,
  HabitsIcon,
  StudyIcon,
  NotesIcon,
  CalendarIcon,
  CardIcon,
  QuestionIcon,
  BookIcon,
  ClassroomIcon,
  TrophyIcon,
  SearchIcon,
  ChatIcon,
  PeopleIcon,
  SettingsIcon,
  ShieldIcon,
  BellIcon,
  TimerIcon,
  TargetIcon,
  DownloadIcon,
  InfoIcon,
} from "@/components/icons";
import { TutorialStartButton } from "@/components/tutorial";

export const metadata = { title: "Feature guide" };

type Feature = {
  href: string;
  title: string;
  Icon: (props: { width?: number; height?: number; className?: string }) => React.ReactNode;
  what: string;
  who?: string;
};

const FEATURES: Feature[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    Icon: DashboardIcon,
    what: "Your home page. Shows quick actions for starting a focus block, logging study, asking a doubt, and opening habits, plus the group's activity snapshot, your streaks, upcoming deadlines, weekly study goal progress, and recent chat.",
    who: "Everyone. Data shown is yours plus group-wide totals.",
  },
  {
    href: "/tasks",
    title: "Tasks & Goals",
    Icon: TasksIcon,
    what: "Plan projects and goals. Use the separate New task panel to create a task in any project or as a standalone task with no project, assign it to one or more members, and set its status (todo, doing, done), priority, and due date. Comment on tasks to keep context together, and see focus time linked from the study timer.",
    who: "Admins create projects, goals, and tasks. Members can move tasks assigned to them and comment on any task; admins can remove anything.",
  },
  {
    href: "/habits",
    title: "Habits",
    Icon: HabitsIcon,
    what: "Create daily habits and check in with one tap. Each check-in builds a streak; missing a day breaks it. Streaks also appear on the dashboard and people page.",
    who: "Everyone. Habits are personal to you.",
  },
  {
    href: "/study",
    title: "Study log",
    Icon: StudyIcon,
    what: "Record study sessions with subject, minutes, date, and optional notes or attachments. The focus timer can link a block to a task and log the minutes you have already focused if you end early.",
    who: "Everyone. Sessions can be shared with the group or kept private.",
  },
  {
    href: "/notes",
    title: "Notes",
    Icon: NotesIcon,
    what: "Shared study notes organised by subject, with search and optional image or file attachments. Everyone can read every note.",
    who: "Anyone can create a note. Only the author or an admin can edit or delete it.",
  },
  {
    href: "/exams",
    title: "Deadlines & exams",
    Icon: CalendarIcon,
    what: "A shared countdown of exams, quizzes, and assignment deadlines, with subject and date. Overdue and soon-due items are highlighted.",
    who: "Everyone can add deadlines. The author or an admin can remove one.",
  },
  {
    href: "/flashcards",
    title: "Flashcards",
    Icon: CardIcon,
    what: "Shared decks reviewed with spaced repetition. Each correct answer moves a card to a later box, so difficult cards come back sooner.",
    who: "Everyone shares decks. Your review schedule and progress are personal to you.",
  },
  {
    href: "/questions",
    title: "Doubts",
    Icon: QuestionIcon,
    what: "Ask a question under a subject and let teammates answer. One answer can be marked as accepted, then saved to notes or turned into a flashcard so the best explanation becomes revision material.",
    who: "Everyone can ask and answer. The asker marks one accepted answer; the asker or an admin can delete.",
  },
  {
    href: "/resources",
    title: "Resources",
    Icon: BookIcon,
    what: "A shared library of past papers, books, videos, and links, organised by subject. Search and filter by type or subject, sort the shelf, or limit it to your own additions. Rows can be pinned, marked useful, and marked read, and subject groups collapse to keep the page short. Add a file or paste a link: the add form can fetch the page title and icon, warns about duplicates, and records paper year, semester, and exam type.",
    who: "Everyone can add resources. Pins, useful marks, and read checklists are personal; the uploader or an admin can remove a resource.",
  },
  {
    href: "/timetable",
    title: "Timetable",
    Icon: ClassroomIcon,
    what: "The group's weekly class calendar. Classes are placed on a real time grid, so the whole week can be read at a glance.",
    who: "Everyone can view it. Only admins can add or remove classes.",
  },
  {
    href: "/grades",
    title: "Grades",
    Icon: TrophyIcon,
    what: "Track courses, assessment weights, and marks, then predict your GPA. Nothing here is visible to other members.",
    who: "Private: only you can see your grades.",
  },
  {
    href: "/search",
    title: "Search",
    Icon: SearchIcon,
    what: "One search box across notes, tasks, resources, and chat messages, so you do not have to remember which page something lives on.",
    who: "Everyone. Results only include what you are allowed to see.",
  },
  {
    href: "/chat",
    title: "Chat",
    Icon: ChatIcon,
    what: "Group channels for conversation and quick updates. Messages refresh automatically, and authors can edit or delete their own messages.",
    who: "Everyone. Admins can remove messages and manage channels.",
  },
  {
    href: "/people",
    title: "People",
    Icon: PeopleIcon,
    what: "The member directory with profile colours, study totals, and streaks over the last 30 days, so you can see how the group is doing.",
    who: "Everyone.",
  },
  {
    href: "/settings",
    title: "Settings",
    Icon: SettingsIcon,
    what: "Change your name, profile colour, photo, timezone, password, and weekly study goal. Choose which events create notifications, enable browser push on each device, subscribe to the calendar feed, export your data, and replay the tutorial from here.",
    who: "Everyone edits their own profile. A super admin can reset any password.",
  },
  {
    href: "/admin",
    title: "Admin dashboard",
    Icon: ShieldIcon,
    what: "Create members, edit anyone's details including username and password, deactivate or delete accounts, and review audit history.",
    who: "Super admins only.",
  },
];

const EXTRAS = [
  {
    Icon: TimerIcon,
    title: "Focus timer",
    body: "A Pomodoro-style timer on the Study page. Link a focus block to an active task, take a break, and log the minutes you have focused if you end early. Completed blocks are saved as study sessions automatically.",
  },
  {
    Icon: TargetIcon,
    title: "Weekly goal",
    body: "Set a target number of study minutes per week. Your progress appears on the dashboard, the study page, and the people page.",
  },
  {
    Icon: BellIcon,
    title: "Notification centre and push",
    body: "The bell in the sidebar or mobile header collects task assignments, comments and @mentions, task status changes, due-today and overdue reminders, and new projects. It shows an unread count and lets you mark one item or everything as read. In Settings you can choose which events create a notification and enable browser push on each device, so alerts arrive even when the portal is closed. On iPhone and iPad, add the portal to your Home Screen first; Safari only allows web push for installed apps. A separate optional group digest can still go to Discord, Telegram, or a custom webhook.",
  },
  {
    Icon: CalendarIcon,
    title: "Calendar feed",
    body: "Subscribe once in Settings to a read-only calendar with group exams, your task deadlines, and the shared timetable. It works in Google Calendar, Apple Calendar, and Outlook; changing your password revokes the link.",
  },
  {
    Icon: DownloadIcon,
    title: "Export",
    body: "Download your own data from Settings as JSON or CSV. The export covers your tasks, habits, study sessions, grades, notes, exams, and flashcard reviews; questions, answers, and resources are not included.",
  },
  {
    Icon: InfoIcon,
    title: "Appearance and navigation",
    body: "The sidebar is grouped into Plan, Study, Track, and Group. Admin, Settings, and Guide stay pinned at the bottom, and profile details plus sign-out live in the profile menu. Choose Light, Dark, or System; when the sidebar is collapsed, the theme button cycles through the same three modes.",
  },
  {
    Icon: InfoIcon,
    title: "Offline support",
    body: "The portal can be installed like an app. Static files are cached for speed, but private pages (Grades, Settings, Admin, Chat) are never cached and the cache is cleared when you sign out. The service worker also receives browser push and opens the relevant task or project when you tap a notification.",
  },
  {
    Icon: InfoIcon,
    title: "Time zone",
    body: "The group runs on Asia/Karachi by default. Your own timezone setting controls how dates and deadlines are shown to you.",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const { Icon } = feature;
  return (
    <Link
      href={feature.href}
      className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-surface2"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon width={17} height={17} />
        </span>
        <span className="text-xs font-medium tabular-nums text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-semibold group-hover:text-brand">{feature.title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted">{feature.what}</p>
      {feature.who ? (
        <p className="mt-2 text-xs font-medium text-brand">{feature.who}</p>
      ) : null}
    </Link>
  );
}

export default async function GuidePage() {
  const me = await requireUser();
  const isAdmin = me.role === "admin";

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Feature guide"
        subtitle="What every page does, and who can change what."
        right={<TutorialStartButton />}
      />

      <Card className="mb-6">
        <h2 className="font-semibold">Start here</h2>
        <p className="mt-2 text-sm text-muted">
          The portal is a shared workspace for the study group. Most pages are visible to every
          member: tasks, habits, study sessions, notes, deadlines, flashcards, doubts, resources,
          the timetable, and chat. A few places are deliberately private: grades are only visible
          to you, and only the author or an admin can edit or delete shared
          content you created.
        </p>
        <p className="mt-2 text-sm text-muted">
          Use the sidebar to move between pages, or the search box at the top of the sidebar to
          jump straight to a note, task, resource, or message. The tour below walks through the
          same ideas step by step.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go to dashboard
          </Link>
          <TutorialStartButton variant="outline" label="Replay the tour" />
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Pages</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.filter((f) => f.href !== "/admin" || isAdmin).map((feature, i) => (
          <FeatureCard key={feature.href} feature={feature} index={i} />
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">
        Also inside the app
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXTRAS.map(({ Icon, title, body }) => (
          <Card key={title} className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon width={17} height={17} />
              </span>
              <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted">{body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <h2 className="font-semibold">Permissions at a glance</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-medium text-ink">Everyone</span> can read all shared content,
            add notes, deadlines, flashcards, doubts, resources, and chat messages, and view the
            timetable. Projects, goals, tasks, and channels are created by admins; members move
            tasks assigned to them and comment on tasks.
          </li>
          <li>
            <span className="font-medium text-ink">Authors</span> can edit or delete what they
            created. For notes, that means only the author or an admin can change a note.
          </li>
          <li>
            <span className="font-medium text-ink">Super admins</span> can manage every member,
            reset passwords, change any profile, add or remove timetable classes, and delete any
            shared content.
          </li>
          <li>
            <span className="font-medium text-ink">Private data</span> such as grades and password
            details is never shown to other members.
          </li>
        </ul>
      </Card>
    </div>
  );
}
