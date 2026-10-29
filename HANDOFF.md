# Portal redesign — handoff (paused 2026-10-29)

Branch: `main` · Baseline commit before this work: `954d045`

## Verification at pause
- `npm run typecheck` — passes
- `npm test` — 37/37 pass
- `.next` was deleted to clear stale route types after moving pages.

## Done
### Correctness / permissions
- `Task.createdById` (nullable, `onDelete: SetNull`), `User.tasksCreated`, index.
- `TimetableEntry.scope` (`group` / `personal`, default `group`), index.
- `User.gpaScale` JSON? (schema only; Grades UI/calculator still deferred).
- Handwritten migration:
  `prisma/migrations/20261029120000_task_creator_timetable_scope_grade_scale/migration.sql`
  **Not applied to any database.**
- Members can create tasks; project/goal creation stays admin-only.
- Added `updateTask` (title, project, goal, priority, due date, assignees) and `canEditTask` / `canDeleteTask`.
  - Creator or admin may edit; legacy `createdById = null` tasks may be edited by any member.
  - Deletion stays creator-or-admin (legacy tasks: admin only).
- Added `updateExam`; author or admin may edit deadlines.
- Added `src/components/dialog.tsx` (accessible modal / mobile bottom sheet).

### Task & deadline UI
- `task-board.tsx`: member “New task” form, edit dialog, permission-aware edit/delete buttons.
- `exams-board.tsx`: edit dialog for deadlines.
- `tasks/page.tsx`: now passes `projectId` and `createdById`.

### Timetable isolation
- `timetable.ts`: anyone may add personal entries; only admins may add group entries; delete is admin or personal owner.
- Timetable page, dashboard next-class query, and `.ics` feed all show `scope = group` plus the viewer’s own personal entries.
- Timetable UI now lets members add personal classes; admins choose group vs personal.

### Study sharing
- `StudyForm` defaults sharing to **on** and resets to on after submit.
- “Shared” badge was already present in `SessionList`.
- Existing study rows were **not backfilled** to `shared = true` (privacy decision still pending).

### Navigation / shell
- Built `Tabs` (`src/components/tabs.tsx`) and `ListRow` (`src/components/list-row.tsx`).
- Created route groups without changing URLs:
  - `src/app/(app)/(work)/{tasks,exams,timetable}` + section tabs
  - `src/app/(app)/(study)/{study,habits}` + section tabs
  - `src/app/(app)/(library)/{notes,resources,questions,flashcards}` + section tabs
- `nav.tsx` reduced to five primary tabs on desktop and mobile:
  Home `/dashboard`, Work `/tasks`, Study `/study`, Library `/notes`, Chat `/chat`.
  Mobile “More” sheet removed.
- Avatar menu now includes People, Grades, Settings, Guide, and Admin (admin only), plus theme/logout.
- Search remains in the top bar only.

## Next tasks
1. **Home redesign**: dashboard is still the old ~10-block page. Reduce it to a “Today” view
   (up next, due/overdue tasks, next deadlines, quick log action), and move charts,
   leaderboard, presence and report into a secondary “This week” section/tab.
2. **Grades phase**: implement per-user percentage-band scale (`User.gpaScale`),
   “needed on final” calculator, and weight-total warnings.
3. **Library phase**: unify Notes / Resources / Doubts / Flashcards with `Tabs` + `ListRow`;
   extend search to cover all library content.
4. **Work phase polish**: make sure every created item is editable; add personal timetable
   scope to dashboard “Up next” copy where useful.
5. **Study phase polish**: decide whether to backfill existing private sessions to shared.
6. **Settings**: remove dead anchors; every setting must work.
7. **Notifications**: explicitly deferred — do not add new kinds/toggles/reminders yet.

## Cautions
- Do **not** apply the migration or run `prisma migrate deploy` against production without confirming
  the database target and taking a backup.
- Run `npx prisma generate` after schema changes (already run once).
- Keep existing URLs; the route-group moves intentionally do not change them.
