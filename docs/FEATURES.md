# Feature guide

This document explains what each part of the Group Portal does and who can change
what. The same content is available inside the app at **Guide**, which is the
canonical version users see; keep the two in sync when adding a feature.

## Pages

| Page | What it does | Who can change it |
| --- | --- | --- |
| Dashboard | Time-aware greeting, an **Up next** strip (next class, nearest deadline, assigned tasks), context-rich stat cards, quick actions, and 7/14/30-day **Me / Group** bar charts for tasks and study. | Everyone sees their own data plus group-wide totals. |
| Tasks & Goals | Projects, goals, a separate **New task** panel, tasks with or without a project, status, priority, one or more assignees, due date, linked focus time, plus comments. | Admins create projects, goals and tasks; members move tasks assigned to them and comment. |
| Habits | Daily habits with one-tap check-ins and streaks. | Personal to each member. |
| Study log | Sessions with subject, minutes, date, notes, and optional attachments; a focus timer can link a block to a task and log elapsed minutes early. | Personal log; sessions marked shared are visible to the group. |
| Notes | Shared notes by subject with search and image/file attachments. | Everyone reads; only the author or an admin edits or deletes. |
| Deadlines & exams | Shared countdown of exams, quizzes and assignments. | Everyone can add; the author or an admin can remove. |
| Flashcards | Shared decks reviewed with spaced repetition (Leitner boxes). | Decks are shared; review schedules are personal. |
| Doubts | Subject-based questions with answers and one accepted answer that can be saved to notes or turned into a flashcard. | Everyone can ask and answer; the asker marks one accepted answer; the asker or an admin can delete. |
| Resources | Shared papers, books, videos and links by subject. Search, type tabs, subject chips, sort, a Mine toggle, collapsible subject groups, and a Recently added strip keep the shelf usable. Each row can be pinned, marked useful, and marked read; add links get a title/favicon preview and a duplicate warning. Rich rows show year, semester, exam type, domain, file type and size. | Everyone can add; the uploader or an admin can remove. Pins, useful marks, and read checklists are personal. |
| Timetable | The group's weekly class calendar on a time grid. | Everyone views; only admins add or remove classes. |
| Grades | Courses, assessment weights, marks and GPA prediction. | Private to each member. |
| Search | One search across notes, tasks, resources and chat messages. | Everyone; results respect access rules. |
| Chat | Group channels with polling refresh; authors edit or delete their own messages. | Everyone; admins moderate. |
| People | Member directory with study totals and streaks. | Everyone. |
| Settings | Profile, colour, photo, timezone, password, weekly goal, per-event notifications, browser push, calendar feed, data export, tutorial. | Your own account. |
| Admin | Create, edit, deactivate and delete members; reset passwords; audit log. | Super admins only. |

## Cross-cutting features

- **Focus timer** — Pomodoro blocks (25/5, 50/10, 15/3) that log a study session
  automatically when a focus block ends. A block can be linked to an active task,
  and unfinished blocks can log their elapsed minutes before ending.
- **Weekly goal** — A target number of study minutes per week, shown as progress
  on the dashboard, study page and people page.
- **Navigation and theme** — The sidebar groups pages into Plan, Study, Track and
  Group, pins only the role-gated Admin link to its footer, and keeps profile
  details and sign-out in the top-bar profile menu. The top bar also holds
  expandable search, a refresh button, and the notification bell. Members can
  collapse the sidebar to icons with tooltips and choose Light, Dark or System.
  On mobile, a safe-area-aware bottom bar offers Home, Tasks, Study, Chat and a
  **More** sheet with every other page and action; Chat and Tasks show unread and
  due-today badges.
- **Signing in** — Invite-only username and password. The form shows or hides the
  password, warns when Caps Lock is on, keeps the username after a failed
  attempt, and announces errors above the sign-in button. Invalid credentials use
  one generic message, repeated attempts are rate-limited, and sessions last 30
  days. Signed-out and expired-session visits explain what happened. A reset
  contact points at `ADMIN_CONTACT` when configured, or at the super admin's
  handle with a copy button. The login page is marked `noindex`.
- **Notification centre** — The top-bar bell shows an unread count and a panel with
  recent events. Members choose which events create a notification: task
  assignments, task comments and @mentions, task status changes, due-today/overdue
  reminders, and new projects. Mark one item or everything as read; notifications
  link straight to the task or project.
- **Browser push** — An opt-in delivery channel on top of the in-app bell. After
  permission is granted, the device is saved as a push subscription and receives
  the same events even when the portal is closed. Push is disabled on a device
  by default and can be turned off again from Settings. On iPhone and iPad,
  Safari only allows web push after the portal is added to the Home Screen.
- **Daily digest webhook (optional)** — A separate group digest of upcoming tasks
  and exams, plus instant webhook alerts for new doubts, deadlines added for
  today or tomorrow, and chat mentions. Sent to Discord, Telegram or a custom
  webhook when configured; the in-app bell and push do not need it. The daily
  cron also creates the due/overdue notifications.
- **Calendar feed** — A signed, read-only `.ics` URL for Google Calendar, Apple
  Calendar or Outlook with group exams, your task deadlines, and the shared
  timetable. Changing your password revokes the link.
- **Data export** — Your own tasks, habits, study sessions, notes, grades, exams
  and flashcard reviews as JSON or CSV. Questions, answers and resources are
  intentionally not included.
- **Tutorial** — An eight-step guided tour. It appears once per browser, can be
  switched off in Settings, and can be replayed from Settings or the Guide page.
- **Offline support** — Installable PWA with standalone display, theme-aware
  `theme-color`, and `viewport-fit=cover` safe-area handling. Only static assets
  are cached; private pages (Grades, Settings, Admin, Chat) are never cached and
  caches are cleared on sign out. The service worker also receives browser push
  and opens the relevant task or project when a notification is clicked.
- **Timezone** — The group default is `Asia/Karachi`; each member's own timezone
  controls how dates are displayed to them.

## Permissions in one line each

- Everyone can read all shared content and add notes, deadlines, flashcards,
  doubts, resources and chat messages. Only admins create projects, goals, tasks
  and channels; members move tasks assigned to them and comment on tasks.
- Resource pins, useful marks and read checklists are per member. Removing a
  resource is limited to its uploader or an admin.
- Authors can edit or delete what they created.
- Super admins can manage members, reset passwords, manage the timetable, and
  delete any shared content.
- Grades and password details are never exposed to other members.
