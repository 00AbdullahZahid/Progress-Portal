# Group Portal

A private web app for a small group to track **tasks and goals**, **habits**, and **study sessions**, and to **chat** — all in one place with a shared analytics dashboard.

Built with **Next.js 15 (App Router) + TypeScript**, **Tailwind CSS v4**, **Prisma + Postgres**, and **Recharts**.

---

## Features

- **Members and auth** — Invite-only. Username + password login (scrypt-hashed). One or more **super admin** accounts.
- **Super admin** — Admins can add, deactivate, reactivate, and delete users; edit anyone's details (name, username, color, timezone, role); and reset any member's password. Creating and deleting projects, goals, tasks, and chat channels is admin-only, enforced on the server.
- **Admin dashboard** — A dedicated super-admin page with group stats, a user manager, and recent audit activity.
- **Tasks and projects** — Projects, goals, and tasks with status badges (todo / doing / done), assignees, priorities, due dates, and progress bars. Assignees (and admins) can move a task's status.
- **Comments** — Comment threads on any task.
- **Habits and check-ins** — Daily habit grid with streaks that keep counting past the current record.
- **Study log** — Log sessions (subject, minutes, notes, date) with optional image and file attachments, per-subject progress bars, and inline editing. Sessions you mark as shared are visible to the rest of the group; private ones stay yours.
- **Focus timer** — A Pomodoro timer (25/5, 50/10, 15/3) that logs a study session automatically when a focus block finishes, so the log stays accurate without manual minute entry.
- **Notes library** — Shared study notes anyone can add to and read. Search and filter by subject; only the author (or an admin) can edit or delete a note.
- **Deadlines & exams** — A shared countdown of exams, quizzes and assignments, with the soonest shown on the dashboard.
- **Flashcards** — Shared decks with spaced repetition (Leitner boxes). Reviews are personal to each member.
- **Doubts / Q&A board** — Ask a question per subject; the group answers and the asker marks one answer as accepted.
- **Resources library** — Past papers, books and links, organised by subject.
- **Timetable** — A shared weekly class calendar on a time grid. Everyone can view it; only admins add or remove classes.
- **Grade & GPA tracker** — Private courses with weights and scores; predicts your GPA on a 4.0 scale.
- **Global search** — Search across notes, tasks, chat messages and resources from the sidebar.
- **Weekly goals & notifications** — Set a weekly study target (shown as a progress ring on the dashboard) and choose what the daily digest includes. The digest is posted to a Discord or Telegram webhook (or any JSON endpoint).
- **Presence & weekly report** — See who is online or studying now, plus a week-in-review breakdown by subject.
- **Data export** — Download your own study sessions, habits, tasks, notes and grades as JSON. Questions, answers and resources are intentionally not included.
- **PWA** — Installable. Static assets are cached for speed, private pages are never cached, and caches are cleared on sign out.
- **Feature guide and tutorial** — An in-app Guide page explains every page and permission, and an optional eight-step tour walks through the app. The tour can be turned off or replayed from Settings. See [`docs/FEATURES.md`](docs/FEATURES.md).
- **Profile pictures** — Upload a photo from Settings (or the admin page for any member); it shows up next to your name everywhere. Falls back to colored initials when unset.
- **Group chat** — Real-time-ish chat with polling (no extra infra needed). Messages can be edited by their author and deleted by the author or an admin; edits and deletes sync into other open windows.
- **Dashboard** — 7-day leaderboard, tasks-completed chart, study-minutes chart, study-by-person breakdown, weekly-goal ring, deadline countdown, presence, and quick links to every section. Charts load lazily so the first paint stays fast.
- **Polished flow** — Toast notifications, confirmation dialogs for destructive actions, inline validation, and empty states on every screen.
- **Collapsible sidebar** — Collapse the nav to icons; it remembers your preference between visits.
- **Polish** — Dark mode, mobile-first responsive layout, SVG icons throughout.

## Accounts

This project keeps **no real names or passwords in the repository**.

The seed only creates the super admin account(s), using values from your environment:

- `ADMIN_HANDLES` — comma-separated usernames to create as super admins (defaults to `admin`).
- `SEED_ADMIN_PASSWORD` — optional. If unset, the seed generates a strong random password and prints it **once**.
- `SEED_MEMBERS` — set to `1` to also create starter member accounts for local development (handles/names come from `SEED_MEMBER_HANDLES` / `SEED_MEMBER_NAMES`). Leave it `0` in production.

**Add members through the app.** Sign in as the super admin, open **Admin**, and create each member (username, display name, color, timezone, role, password). Members change their own password from **Settings > Change your password**.

Seeding only creates account(s) and a default `#General` chat channel — it does **not** create any sample projects, tasks, habits, or messages. The app starts clean.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env and fill it in
cp .env.example .env

# 3. Create the tables (applies migrations)
npx prisma migrate deploy

# 4. Create the super admin
npx prisma db seed

# 5. Run in development
npm run dev
```

Open **http://localhost:3000** and sign in with the admin username from `ADMIN_HANDLES` and the password from `SEED_ADMIN_PASSWORD` (or the random one the seed printed).

### Production

```bash
npm run build
npm run start
```

## Scripts

| Script             | What it does                          |
|--------------------|---------------------------------------|
| `npm run dev`      | Start the dev server                  |
| `npm run build`    | Production build                      |
| `npm run start`    | Run the production build              |
| `npm run lint`     | ESLint (`eslint .`)                   |
| `npm run typecheck`| TypeScript check (`tsc --noEmit`)     |
| `npm run db:deploy`| Apply migrations                      |
| `npm run db:seed`  | Seed the admin / starter data         |
| `npm run db:studio`| Open Prisma Studio                    |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, and `prisma validate` on every push and pull request.

## Environment

Copy `.env.example` to `.env` and set:

```
DATABASE_URL="postgresql://..."        # pooled Postgres connection string
DIRECT_URL="postgresql://..."          # non-pooled URL, used by Prisma Migrate
AUTH_SECRET="long-random-hex"          # used to sign session cookies
APP_URL="http://localhost:3000"
ADMIN_HANDLES="admin"                  # usernames to create as super admins
SEED_MEMBERS="0"                        # "1" only for local dev
# SEED_ADMIN_PASSWORD=""               # optional; random when unset
# BLOB_READ_WRITE_TOKEN=""             # Vercel Blob token for uploads
# CRON_SECRET=""                       # bearer token Vercel Cron sends to the jobs
# NOTIFY_WEBHOOK_URL=""                # Discord/Telegram/JSON webhook for the digest
# NOTIFY_TELEGRAM_CHAT_ID=""           # required when the webhook is Telegram
```

`.env` is git-ignored. Only `.env.example` (placeholders) is committed.

### File uploads (Vercel Blob)

Study attachments, note images/files, resource uploads and profile pictures are
stored with **Vercel Blob**:

1. In the Vercel dashboard, open **Storage > Blob** and create a store.
2. Copy its **read/write token** into `BLOB_READ_WRITE_TOKEN` (locally in `.env`,
   and in the Vercel project's environment variables).
3. Redeploy.

If the token is unset, uploads are disabled with a clear message but the rest of
the app keeps working. Files are capped at 3.5MB (2MB for avatars), limited to
images and common document types (no SVG or HTML), checked by extension and
magic bytes (including Office formats), and rate-limited to 20 uploads per hour
per user. Uploaded files use private, hard-to-guess links — anyone with the link
can open them, so treat them as shareable rather than secret.

Every upload is recorded in an `Upload` row that names its owner. A file is only
deleted when the actor owns it **and** no saved row still references it, so a
member can't delete a teammate's file. A daily cron (`/api/cleanup`) removes
uploads that were never attached to a saved form and are more than 24 hours old.

### Notifications (optional)

Set `NOTIFY_WEBHOOK_URL` to receive a daily digest of upcoming tasks and exams.
Discord (`content`), Telegram (`chat_id` + `text`, needs
`NOTIFY_TELEGRAM_CHAT_ID`), and generic `{ "text": ... }` endpoints are
supported. The `/api/notify` route runs on a cron; set `CRON_SECRET` so Vercel
signs the invocation (a manual run can pass `?key=<CRON_SECRET>`).

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database (Postgres)

This app uses **Postgres** so it can run both locally and on Vercel (SQLite does not work on serverless hosts).

1. Create a free Postgres database — for example [Neon](https://neon.tech) or Vercel's Postgres integration.
2. Put the **pooled** connection string in `DATABASE_URL` and the **direct** (non-pooled) string in `DIRECT_URL`. On Vercel's integration these are `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
3. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed the admin:
   ```bash
   npx prisma db seed
   ```

### Deploying to Vercel

1. In the Vercel project, add environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `ADMIN_HANDLES`, and `BLOB_READ_WRITE_TOKEN` (leave `SEED_ADMIN_PASSWORD` unset unless you want a known password).
2. Deploy. The `postinstall` script runs `prisma generate` automatically.
3. Run the schema and seed against the production database (locally, with the prod URLs in `.env`):
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
4. Verify the admin can log in, then add members from **Admin** in the app.

## Project structure

```
prisma/
  schema.prisma          # Data model (User, Project, Goal, Task, Habit, StudySession, Note, Exam, Flashcard, Question, Resource, Course, TimetableEntry, Upload, Channel, Message, AuditLog)
  migrations/            # Prisma migrations
  seed.ts                # Seeds admin(s) + default chat channel (no real names, no sample data)
src/
  app/
    (app)/               # Authenticated pages (dashboard, admin, tasks, habits, study, notes, exams, flashcards, questions, resources, timetable, grades, search, chat, people, settings)
    api/chat/            # Chat polling endpoint
    api/upload/          # File upload endpoint (Vercel Blob)
    api/cleanup/         # Daily cron: sweep orphaned uploads
    api/notify/          # Daily cron: notification digest
    login/               # Login page
    error.tsx            # Route error boundary
    not-found.tsx        # 404 page
  components/            # UI components (icons, task-board, habit-tracker, chat-window, charts, notes-board, etc.)
  lib/
    actions/             # Server actions (mutations)
    auth.ts              # Session handling (JWT cookie), role checks, cache()
    blob.ts              # Blob deletion with ownership + reference checks
    upload-rules.ts      # Shared upload size/type/signature rules
    notify.ts            # Digest builder + webhook sender
    db.ts                # Prisma client
    dates.ts             # Timezone-aware date + streak helpers
    security.ts          # Password hashing (scrypt)
    validation.ts        # Shared input validation
    rate-limit.ts        # Login attempt throttling
    audit.ts             # Admin action audit logging
    upload-client.ts     # Client helper for the upload endpoint
  middleware.ts          # Cookie-presence auth gate for app routes
public/
  manifest.webmanifest   # PWA manifest
  sw.js                  # Service worker (offline reading)
vercel.json              # Cron schedule
```

## Security notes

- Passwords are hashed with scrypt and verified in constant time. Login attempts are rate-limited.
- Sessions are signed JWTs in an httpOnly cookie. Deactivating a user or resetting their password invalidates existing sessions (token versioning).
- The production build refuses to start without a `AUTH_SECRET`.
- Admin-only actions (projects, goals, tasks, channels, user management, password resets) are enforced on the server, not just hidden in the UI.
- Admin mutations are recorded in an `AuditLog` and visible on the Admin page.
- Habit and study actions are scoped to the current user — you can only edit or delete your own sessions, and only `shared` sessions are visible to others.
- Uploads are validated by size, MIME type, extension, and magic bytes in `/api/upload`, require a signed-in session, are rate-limited per user, and use randomized blob paths. Each upload is owned by its uploader; deletion requires ownership and that no saved row still references the file.
- Notes, exams, flashcards, doubts, resources and timetable actions are scoped on the server: everyone can read, but only the author (or an admin) can delete shared items. Grades are private to their owner.
- Security headers and a Content-Security-Policy are set in `next.config.ts`.

## Tech choices (and why)

- **Polling chat instead of WebSockets** — zero extra infrastructure, perfectly fine for a small group. Polling pauses on hidden tabs.
- **Postgres** — works both locally and on serverless hosts like Vercel (SQLite can't persist on serverless).
- **scrypt from Node's crypto** — no external dependency needed for password hashing.
- **Lazy-loaded Recharts** — the charting library loads after first paint, keeping the dashboard's initial bundle small.

---

Made for a small group. Enjoy.
