# Portal handoff — Subject / Project restructure (2026-10-30)

Branch: `main` · HEAD: `bc39e9c` · **the restructure and hardening are uncommitted**

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

> Hardening pass (2026-11-02): production now contains 5 subjects and 2 tasks. Both tasks
> are linked to subjects/projects, so the earlier “5 unlinked tasks” and duplicate
> “Generative AI outline study” rows no longer exist. No data was rewritten in this pass.

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
- Status is a dropdown (`todo` / `doing` / `done`) with a per-task double-submit guard.
- Task creation is guarded against double submits; quick-add and comment forms reset after
  a successful save.
- Any member can create a subject. Subject edit, archive, restore, merge, and delete remain
  admin-only.
- Archive is the normal subject action. Delete requires typing the subject name and is
  refused while the subject still has chat messages (archive instead).
- Merge moves tasks, exams, notes, resources, questions, study sessions, flashcards and
  timetable entries to a target subject, detaches tasks/exams from source projects, then
  archives the source. Source chat history stays attached to the archived subject.
- Archived subjects hide project/task creation controls and can be restored.

### Subject pickers
- Shared `SubjectSelect` (`src/components/subject-select.tsx`) replaces free-text subject
  inputs in notes, resources, questions, deadlines/exams, study logging, session editing,
  timetable, and task forms.
- Pickers submit `subjectId`; actions resolve the canonical subject through
  `requireSubject` and still write its display name into the legacy text column.
- Legacy text columns remain as a read fallback; archived subjects are labelled.
- Task details show the linked subject/project; library filters fall back to the legacy
  text when an older row has no `subjectId`.

### Subject linking
- `src/lib/subject-link.ts` resolves an explicit `subjectId`, or falls back to a trimmed,
  case-insensitive name match (`resolveSubjectId` / `findSubjectIdByName`).
- Required forms use `requireSubject`, which rejects unknown names so a typo cannot create
  an unlinked row.
- Wired into notes, resources, questions (including “save answer as note/flashcard”), exams,
  study sessions, and timetable entries.
- Chat labels subject channels as `Subject: …`.

### Terminology
- Guide, tutorial, quick links, notification settings, search, calendar feed, CSV export,
  study page, and chat now say Subject / Project instead of Project / Goal.
- Audit actions added: `subject.create`, `subject.update`, `subject.archive`,
  `subject.restore`, `subject.merge`, `subject.delete`; historical `goal.*` entries are
  retained.

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
2. The backfilled subjects include messy free-text names. Admins can now merge or rename
   them from the tasks page; removing the legacy text columns is still a later cleanup.
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
