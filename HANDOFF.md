# Portal handoff — Subject / Project restructure (2026-10-30)

Branch: `main` · HEAD: `96bc3af` · **the restructure is uncommitted**

## Verification
- `npm run typecheck` — passes
- `npm test` — 44/44 pass
- `npm run lint` — passes with one pre-existing `<img>` warning in `sidebar-logo.tsx`
- `npm run build` — passes (27 pages)
- `npx prisma migrate diff --from-url <production> --to-schema-datamodel prisma/schema.prisma`
  — **No difference detected**
- `npx prisma migrate status` — 12 migrations applied, database up to date

## What changed
### Schema (`prisma/schema.prisma`)
- `Project` → **`Subject`**; `Goal` → **`Project`**. Existing table rows keep their ids.
- `Task.projectId` → `subjectId`; `Task.goalId` → `projectId`.
- `Channel.projectId` → `subjectId`; `ChannelKind.project` → `ChannelKind.subject`.
- `Subject` gains `color` (default `#2563eb`) and `archivedAt`.
- `Exam` gains optional `subjectId` and `projectId`.
- Notes, resources, flashcards, questions, study sessions, and timetable entries gain an
  optional `subjectId`.
- Deletes: `Subject` cascades to its projects, tasks, and channel; linked exams/library rows
  use `SetNull`. Deleting a project detaches its tasks (`SetNull`) instead of deleting them.
- Legacy free-text `subject` columns are intentionally **kept** on notes, resources, exams,
  questions, and study sessions until a later cleanup.

### Migration
`prisma/migrations/20261030160000_subject_project_restructure/migration.sql`
- Handwritten `ALTER TABLE … RENAME` (no drop/create), including PK/FK/index renames.
- Backfills a `Subject` for every distinct trimmed, case-insensitive free-text subject
  (`id = 'sub_' || md5(lower(name))`) and links Note/Resource/Exam/Question/StudySession.
- Validated end-to-end first on a temporary local Postgres restored from the backup:
  migration applied, `prisma migrate diff` clean, all rows preserved, no orphan links.
- **Applied to the Neon `neondb` database on 2026-10-30 via `npx prisma migrate deploy`.**

### Production data after migration
| Thing | Count |
| --- | --- |
| Users | 6 |
| Subjects (11 created from existing text) | 11 |
| Projects (no legacy goals existed) | 0 |
| Tasks | 5 |
| Channels (all `group`) | 1 |
| Exams | 2 |
| Resources | 1 |
| Questions | 1 |
| Study sessions | 8 |
| Timetable entries | 7 |

Backfill links: Resource 1/1, Exam 2/2, Question 1/1, StudySession 8/8. Notes and flashcards
had no rows. Timetable entries have no old text subject, so they stay unlinked until edited.
Tasks stay unlinked because there were no legacy projects/goals to map from.

### Backups
- `C:\Users\ADMIN\AppData\Local\Temp\opencode\progress-portal-backup-20261030.dump`
- `C:\Users\ADMIN\AppData\Local\Temp\opencode\progress-portal-backup-pre-migration-20261030.dump`
  (taken immediately before the production migration)

### Tasks page (`src/components/task-board.tsx`)
- Mine / Everyone toggle and Subjects / By due date views.
- Subject cards with colour chip, project count, open/done counts, progress bar, next due,
  and linked focus time.
- Collapsible projects inside each subject, with per-project quick add.
- Direct subject tasks are listed separately; subject-level quick add lives on each card.
- Dialogs for creating/editing subjects and projects; no permanent “New project” form.
- Quick add works for members; subject/project create and edit stay admin-only.
- Tasks can sit directly under a subject or inside one of its projects.

### Subject linking
- `src/lib/subject-link.ts` resolves an explicit `subjectId`, or falls back to a trimmed,
  case-insensitive name match (`resolveSubjectId` / `findSubjectIdByName`).
- Wired into notes, resources, questions (including “save answer as note/flashcard”), exams,
  study sessions, and timetable entries.
- Library/deadline/study/timetable forms keep their text inputs; exams and timetable also
  offer a subject datalist/picker.
- Chat labels subject channels as `Subject: …`.

### Terminology
- Guide, tutorial, quick links, notification settings, search, calendar feed, CSV export,
  study page, and chat now say Subject / Project instead of Project / Goal.
- Audit actions added: `subject.create`, `subject.update`, `subject.delete`; historical
  `goal.*` entries are retained.

## Code cleanup
- Removed dead module `src/components/quick-links.tsx` and three unused icons.
- Removed unused helpers/actions: `isReferenced`, `clearAppCaches`, `ThemeCycle`,
  `useAction`, `createChannel`, the unused mark-notification-read server actions, and
  `isAdmin`.
- Narrowed `export` on symbols used only inside their own module (theme helpers, calendar
  types, rate-limit/security constants, upload/notify internals, tutorial opener, note and
  question types).
- Extracted shared create/edit task validation into `parseTaskFields`.
- Deleted three unreferenced public icons; refreshed `README.md` and `docs/FEATURES.md`
  terminology.
- `npx knip` now reports only two known false positives (`public/sw.js` and
  `eslint-config-next`).

## Known follow-ups
1. **Default assignees and Shared vs Everyone task completion** (`4/6 done`) still need a
   design/schema decision; there is no subject-membership model.
2. The 11 backfilled subjects include messy free-text names (for example
   “Generative AI Assignment And Research.”). Consider a merge/rename tool before removing
   the legacy text columns.
3. Decide whether existing private study sessions should become shared (unchanged).
4. Notifications remain **deferred**. Audit found missing `doubt_answered`, `answer_accepted`,
   and `deadline_added` events, daily repeat overdue reminders, and no notification pruning.
5. Consider a `vercel-build` script that runs `prisma migrate deploy` so future schema
   changes cannot deploy ahead of the database.

## Cautions
- The restructure migration is applied to production; run `npx prisma generate` after schema
  changes. The Vercel build does not run `prisma migrate deploy` automatically.
- Keep existing URLs; the route-group moves intentionally do not change them.
- Uncommitted work exists; **do not commit or push**.
