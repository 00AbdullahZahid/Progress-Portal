# Feature guide

This document explains what each part of the Group Portal does and who can change
what. The same content is available inside the app at **Guide**, which is the
canonical version users see; keep the two in sync when adding a feature.

## Pages

| Page | What it does | Who can change it |
| --- | --- | --- |
| Dashboard | Group activity snapshot, streaks, upcoming deadlines, weekly goal ring, focus timer, recent chat. | Everyone sees their own data plus group-wide totals. |
| Tasks & Goals | Projects, goals, tasks with status, priority, assignee and due date, plus comments. | Everyone can create and edit; admins can remove anything. |
| Habits | Daily habits with one-tap check-ins and streaks. | Personal to each member. |
| Study log | Sessions with subject, minutes, date, notes, and optional attachments; totals against the weekly goal. | Personal log; sessions marked shared are visible to the group. |
| Notes | Shared notes by subject with search and image/file attachments. | Everyone reads; only the author or an admin edits or deletes. |
| Deadlines & exams | Shared countdown of exams, quizzes and assignments. | Everyone can add; the author or an admin can remove. |
| Flashcards | Shared decks reviewed with spaced repetition (Leitner boxes). | Decks are shared; review schedules are personal. |
| Doubts | Subject-based questions with answers and one accepted answer. | Everyone can ask and answer; asker or admin can mark accepted and delete. |
| Resources | Shared papers, books, videos and links by subject, uploaded or linked. | Everyone can add; uploader or admin can remove. |
| Timetable | The group's weekly class calendar on a time grid. | Everyone views; only admins add or remove classes. |
| Grades | Courses, assessment weights, marks and GPA prediction. | Private to each member. |
| Search | One search across notes, tasks, resources and chat messages. | Everyone; results respect access rules. |
| Chat | Group channels with polling refresh and attachments. | Everyone; admins moderate. |
| People | Member directory with study totals and streaks. | Everyone. |
| Settings | Profile, colour, photo, timezone, password, weekly goal, notifications, tutorial. | Your own account. |
| Admin | Create, edit, deactivate and delete members; reset passwords; audit log. | Super admins only. |

## Cross-cutting features

- **Focus timer** — Pomodoro blocks (25/5, 50/10, 15/3) that log a study session
  automatically when a focus block ends.
- **Weekly goal** — A target number of study minutes per week, shown as progress
  on the dashboard, study page and people page.
- **Notifications** — An optional daily digest of upcoming tasks and exams, sent
  to the group's Discord, Telegram or custom webhook.
- **Data export** — Your own tasks, habits, study sessions, notes and grades as
  JSON. Questions, answers and resources are intentionally not included.
- **Tutorial** — An eight-step guided tour. It appears once per browser, can be
  switched off in Settings, and can be replayed from Settings or the Guide page.
- **Offline support** — Installable PWA. Only static assets are cached; private
  pages (Grades, Settings, Admin, Chat) are never cached and caches are cleared
  on sign out.
- **Timezone** — The group default is `Asia/Karachi`; each member's own timezone
  controls how dates are displayed to them.

## Permissions in one line each

- Everyone can read all shared content and create new shared items.
- Authors can edit or delete what they created.
- Super admins can manage members, reset passwords, manage the timetable, and
  delete any shared content.
- Grades and password details are never exposed to other members.
