# Portal redesign — handoff (paused 2026-10-29)

Branch: `main` · Baseline commit before this work: `954d045`

## Verification at pause
- `npm run typecheck` — passes
- `npm test` — 44/44 pass
- `npm run lint` — passes with one pre-existing `<img>` warning in `sidebar-logo.tsx`
- `npm run build` — passes (27 pages)
- `.next` was deleted once to clear stale route types after moving pages.

## Done
### Correctness / permissions
- `Task.createdById` (nullable, `onDelete: SetNull`), `User.tasksCreated`, index.
- `TimetableEntry.scope` (`group` / `personal`, default `group`), index.
- `User.gpaScale` JSON? for a private percentage-band scale.
- Handwritten migration:
  `prisma/migrations/20261029120000_task_creator_timetable_scope_grade_scale/migration.sql`
  **Not applied to any database.**
- Members can create tasks; project/goal creation stays admin-only.
- `updateTask` edits title, project, goal, priority, due date, assignees; status stays in
  `setTaskStatus`. Permissions live in `src/lib/task-permissions.ts` (kept outside the
  `"use server"` module because every export there must be async).
  - Creator or admin may edit; legacy `createdById = null` tasks may be edited by any member.
  - Deletion stays creator-or-admin (legacy tasks: admin only).
- Added `updateExam`; author or admin may edit deadlines.
- Added `updateProject` (renames the project's chat channel too) and `updateGoal`.
- Added `updateTimetableEntry`: personal entry → owner only; group entry → admin only;
  scope cannot be changed on edit.
- Added `updateResource` (metadata only, not link/file), `updateQuestion`, `updateFlashcard`,
  and `renameHabit`; each is author/owner-or-admin.
- Added `src/components/dialog.tsx` (accessible modal / mobile bottom sheet).

### Home
- Dashboard reduced to a “Today” view: `UpNext`, quick actions, task/deadline lists.
- Charts, stats, leaderboard, widgets, and recent chat are collapsed under a native
  `<details>` “This week at a glance”.
- `QuickLinks` removed from Home (still exists in the codebase, unused there).

### Grades
- `src/lib/grades.ts` holds band maths, weighted percentage, “needed on remaining”,
  and weight-total warnings; covered by `src/lib/grades.test.ts`.
- Private per-user scale stored in `User.gpaScale`; reset uses `Prisma.DbNull`.
- `grades-board.tsx`: add/edit/delete courses and items, scale editor, per-course target
  calculator, and weight warnings. Only the owner's courses are queried.
- `gpaScale` is included in `SESSION_USER_SELECT` in `src/lib/auth.ts`.

### Task & deadline UI
- `task-board.tsx`: member “New task” form, task edit dialog, project rename dialog, goal
  edit dialog, permission-aware edit/delete buttons.
- `exams-board.tsx`: edit dialog for deadlines.
- `tasks/page.tsx`: passes `projectId` and `createdById`.

### Timetable isolation
- `timetable.ts`: anyone may add personal entries; only admins may add group entries;
  delete/edit is admin or personal owner.
- Timetable page, dashboard next-class query, and `.ics` feed all show `scope = group`
  plus the viewer’s own personal entries.
- Timetable UI lets members add personal classes; admins choose group vs personal.

### Study sharing
- `StudyForm` defaults sharing to **on** and resets to on after submit.
- “Shared” badge was already present in `SessionList`.
- Habits can be renamed without losing check-in history.
- Existing study rows were **not backfilled** to `shared = true` (privacy decision pending).

### Navigation / shell
- Built `Tabs` (`src/components/tabs.tsx`) and `ListRow` (`src/components/list-row.tsx`).
- Created route groups without changing URLs:
  - `src/app/(app)/(work)/{tasks,exams,timetable}` + section tabs
  - `src/app/(app)/(study)/{study,habits}` + section tabs
  - `src/app/(app)/(library)/{notes,resources,questions,flashcards}` + section tabs
- `nav.tsx` reduced to five primary tabs on desktop and mobile:
  Home `/dashboard`, Work `/tasks`, Study `/study`, Library `/notes`, Chat `/chat`.
  Mobile “More” sheet removed.
- Avatar menu includes People, Grades, Settings, Guide, and Admin (admin only), plus theme/logout.
- Search remains in the top bar only. `/search` now covers tasks, deadlines, notes, doubts,
  flashcards, resources, chat, and people using `ListRow`.

### Settings
- Every anchor section exists and works; no dead `href="#"` links.

## Next tasks
1. **Apply the migration** once the target database and a backup are confirmed. Do not run
   `prisma migrate deploy` against production blindly.
2. **Decide study backfill**: should existing private sessions become shared?
3. **Notifications**: explicitly deferred — do not add new kinds/toggles/reminders yet.

## Cautions
- Do **not** apply the migration or run `prisma migrate deploy` against production without
  confirming the database target and taking a backup.
- Run `npx prisma generate` after schema changes (already run once).
- Keep existing URLs; the route-group moves intentionally do not change them.
- Uncommitted work exists; **do not commit or push**.
