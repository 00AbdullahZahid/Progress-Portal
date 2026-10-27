# Group Portal

A private web app for a small group to track **tasks and goals**, **habits**, and **study sessions**, and to **chat** — all in one place with a shared analytics dashboard.

Built with **Next.js 15 (App Router) + TypeScript**, **Tailwind CSS v4**, **Prisma + Postgres**, and **Recharts**.

---

## Features

- **Members and auth** — Invite-only. Username + password login (scrypt-hashed), generic invalid-credential errors, rate limiting, show/hide password, Caps Lock warning, and a one-tap admin contact for resets. Sessions last 30 days and expired sessions explain themselves instead of silently bouncing.
- **Super admin** — Admins can add, deactivate, reactivate, and delete users; edit anyone's details (name, username, color, timezone, role); and reset any member's password. Creating and deleting projects, goals, tasks, and chat channels is admin-only, enforced on the server.
- **Admin dashboard** — A dedicated super-admin page with group stats, a user manager, and recent audit activity.
- **Tasks and projects** — Projects, goals, standalone tasks, and a dedicated **New task** panel for creating tasks with or without a project. Tasks support one or more assignees, priorities, due dates, progress bars, and linked focus time. Every assignee (and admins) can move a task's status.
- **Comments** — Comment threads on any task.
- **Habits and check-ins** — Daily habit grid with streaks that keep counting past the current record.
- **Study log** — Log sessions (subject, minutes, notes, date) with optional image and file attachments, per-subject progress bars, and inline editing. Sessions you mark as shared are visible to the rest of the group; private ones stay yours.
- **Focus timer** — A Pomodoro timer (25/5, 50/10, 15/3) that logs a study session automatically when a focus block finishes. Link a block to an active task; if you end early, you can log the minutes you have already focused instead of losing them.
- **Notes library** — Shared study notes anyone can add to and read. Search and filter by subject; only the author (or an admin) can edit or delete a note.
- **Deadlines & exams** — A shared countdown of exams, quizzes and assignments, with the soonest shown on the dashboard.
- **Flashcards** — Shared decks with spaced repetition (Leitner boxes). Reviews are personal to each member.
- **Doubts / Q&A board** — Ask a question per subject; the group answers and the asker marks one answer as accepted. Any member can save an accepted answer to notes or turn it into a flashcard.
- **Resources library** — Past papers, books, videos and links, organised by subject. Search, filter by type or subject, sort, and limit the shelf to your own additions. Pin important items, mark them useful, track read progress, collapse subject groups, and see rich metadata (year, semester, exam type, domain, file type and size). The add modal can fetch a link's title/favicon, warns about duplicates, and every new resource gets a toast with a jump link. Removal is owner/admin-only with confirmation.
- **Timetable** — A shared weekly class calendar on a time grid. Everyone can view it; only admins add or remove classes.
- **Grade & GPA tracker** — Private courses with weights and scores; predicts your GPA on a 4.0 scale.
- **Global search** - Search across notes, tasks, chat messages and resources from the top bar, or press Ctrl/Cmd+K (or `/`) anywhere to start a search.
- **Weekly goals & notification centre** — Set a weekly study target (shown as a progress ring on the dashboard). The top-bar bell shows an unread count and collects task assignments, task comments and mentions, task status changes, due-today/overdue reminders, and new projects. Every event can be switched on or off per member, and any item or the whole list can be marked read. An optional daily digest still posts to Discord, Telegram, or any JSON webhook.
- **Browser push** — Opt-in Web Push on top of the in-app bell. Generate VAPID keys, save each device's subscription, and receive the same events while the portal is closed. Push can be turned off again per device. iPhone/iPad users must add the portal to their Home Screen first because Safari only supports web push for installed apps.
- **Presence & weekly report** — See who is online or studying now, plus a week-in-review breakdown by subject.
- **Data export** - Download your own study sessions, habits, tasks, notes, grades, exams and flashcard reviews as JSON or CSV. Questions, answers and resources are intentionally not included.
- **Calendar feed** — Subscribe once in Settings to a signed, read-only `.ics` feed with group exams, your task deadlines, and the shared timetable. Changing your password revokes the link.
- **PWA** — Installable. Static assets are cached for speed, private pages are never cached, caches are cleared on sign out, and the service worker receives push notifications and opens the relevant task or project.
- **Feature guide and tutorial** — An in-app Guide page explains every page and permission, and an optional eight-step tour walks through the app. The tour can be turned off or replayed from Settings. See [`docs/FEATURES.md`](docs/FEATURES.md).
- **Profile pictures** — Upload a photo from Settings (or the admin page for any member); it shows up next to your name everywhere. Falls back to colored initials when unset.
- **Group chat** — Real-time-ish chat with polling (no extra infra needed). Messages can be edited by their author and deleted by the author or an admin; edits and deletes sync into other open windows.
- **Dashboard** — A time-aware greeting, an **Up next** strip (next class, nearest deadline, assigned tasks), context-rich stat cards, quick actions, and 7/14/30-day **Me / Group** bar charts for tasks and study minutes. Study time is minute-aware and shows daily-goal progress when configured; charts load lazily so the first paint stays fast.
- **Polished flow** — Toast notifications, confirmation dialogs for destructive actions, inline validation, and empty states on every screen.
- **Navigation** — A grouped, collapsible desktop sidebar (Plan, Study, Track, Group) with only the role-gated Admin link pinned to its footer. The top bar holds expandable search, refresh, the notification bell, and the profile menu (Settings, Guide, Theme, Sign out). On mobile, a safe-area-aware bottom bar offers Home, Tasks, Study, Chat, and a **More** sheet with every other page and action; Chat and Tasks show unread/due badges.
- **Polish** - Light, Dark, and System modes plus eight accent colours, set in Settings > Appearance and saved per device (a one-tap theme switch also sits in the top bar and on the sign-in screen). Mobile-first responsive layout, SVG icons throughout, visible focus states, and 44px mobile tap targets on primary controls.

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

CI (`.github/workflows/ci.yml`) runs `prisma validate`, typecheck, lint, tests, and a full `next build` on every push and pull request.

## Environment

Copy `.env.example` to `.env` and set:

```
DATABASE_URL="postgresql://..."        # pooled Postgres connection string
DIRECT_URL="postgresql://..."          # non-pooled URL, used by Prisma Migrate
AUTH_SECRET="long-random-hex"          # signs session cookies and calendar feeds
APP_URL="http://localhost:3000"
# ADMIN_CONTACT=""                     # optional login-page reset contact (email, phone, or URL)
ADMIN_HANDLES="admin"                  # usernames to create as super admins
SEED_MEMBERS="0"                        # "1" only for local dev
# SEED_ADMIN_PASSWORD=""               # optional; random when unset
# BLOB_READ_WRITE_TOKEN=""             # Vercel Blob token for uploads
# CRON_SECRET=""                       # bearer token Vercel Cron sends to the jobs
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=""      # Web Push public key (build-time)
# VAPID_PRIVATE_KEY=""                 # Web Push private key (server-only)
# VAPID_SUBJECT="mailto:you@example.com"
# NOTIFY_WEBHOOK_URL=""                # Discord/Telegram/JSON webhook for digests and alerts
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
per user. Uploaded files use public, hard-to-guess links — anyone with the link
can open them, even without signing in, so treat them as shareable rather than secret.

Every upload is recorded in an `Upload` row that names its owner. New
attachments must point at one of your own uploads, and a file is only deleted
when no saved row still references it, so a member can't delete a teammate's
file by pasting its URL. A daily cron (`/api/cleanup`) removes uploads that were
never attached to a saved form and are more than 24 hours old, then re-checks a
rotating batch of older claimed uploads for files orphaned by later edits or
deletions. A tracking row is also removed when its blob is already missing, so
failed or out-of-band deletions cannot leave permanent rows behind.

**Production checklist.** Create the Blob store in the same Vercel project and
set `BLOB_READ_WRITE_TOKEN` for **Production** (and Preview if you want uploads
there), then redeploy. If the token is missing or belongs to a store that is not
linked to the project, `/api/upload` returns a clear error instead of writing to
the local filesystem — Vercel functions do not have persistent writable storage.
Check the deployment logs for `[upload] put() failed` when diagnosing.

Set `CRON_SECRET` in Vercel as well. Vercel Cron automatically sends it as
`Authorization: Bearer <secret>`; without it the production jobs return 401 and
no cleanup or due reminders run. The cron also skips blob cleanup when
`BLOB_READ_WRITE_TOKEN` is unset, while the rest of the app keeps working.

### Notifications and browser push

The **in-app notification centre** needs no extra configuration. The bell in the
sidebar/mobile header collects task assignments, task comments and @mentions,
task status changes, due-today/overdue reminders, and new projects. Each member
chooses those events in **Settings > Notifications**, can mark items or the whole
list read, and follows a link straight to the task or project. The daily
`/api/notify` cron creates the due/overdue reminders for each member's timezone.

**Browser push** is opt-in per device and uses Web Push with VAPID:

```bash
npx web-push generate-vapid-keys
```

Add the generated values to the environment:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:you@example.com"
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is exposed to the browser and is read at build
time, so set it before deploying. Keep `VAPID_PRIVATE_KEY` server-side only.
Members enable push from **Settings > Notifications**; each enabled device gets
its own subscription, and stale subscriptions are removed automatically when a
push service reports them gone. Changing the VAPID key pair invalidates existing
subscriptions; members can simply enable push again. On iPhone and iPad, Safari
only allows web push after the portal is added to the **Home Screen**, so the UI
shows that note in Settings.

The **optional webhook digest** is separate from the bell and push. Set
`NOTIFY_WEBHOOK_URL` to receive a daily digest of upcoming tasks and exams, plus
instant alerts for new doubts, deadlines added for today or tomorrow, and chat
mentions. Discord (`content`), Telegram (`chat_id` + `text`, needs
`NOTIFY_TELEGRAM_CHAT_ID`), and generic `{ "text": ... }` endpoints are
supported. The same `/api/notify` cron also creates the in-app due/overdue
reminders, so leave the webhook unset if you only want in-app notifications.

Set `CRON_SECRET` so Vercel signs cron invocations. For a manual run, send
`Authorization: Bearer <CRON_SECRET>` (the secret is not accepted in the query
string). Generate a secret with:

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

1. In the Vercel project, add environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, `ADMIN_HANDLES`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (if uploads are enabled), and the three VAPID values if you want browser push (leave `SEED_ADMIN_PASSWORD` unset unless you want a known password). Optionally set `ADMIN_CONTACT` so the login page shows a real reset contact. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` before the build; the other keys can be added at the same time.
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
  schema.prisma          # Data model (User, Project, Goal, Task, Habit, StudySession, Note, Exam, Flashcard, Question, Resource, ResourceFavorite/Useful/Read, Notification, PushSubscription, Course, TimetableEntry, Upload, Channel, Message, AuditLog)
  migrations/            # Prisma migrations
  seed.ts                # Seeds admin(s) + default chat channel (no real names, no sample data)
src/
  app/
    (app)/               # Authenticated pages (dashboard, admin, tasks, habits, study, notes, exams, flashcards, questions, resources, timetable, grades, search, chat, people, settings)
    api/chat/            # Chat polling endpoint
    api/upload/          # File upload endpoint (Vercel Blob)
    api/cleanup/         # Daily cron: sweep orphaned uploads
    api/notify/          # Daily cron: in-app due reminders + optional webhook digest
    api/link-preview/    # Auth + SSRF-guarded Open Graph metadata for resources
    api/push/            # Save/remove browser push subscriptions
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
    notifications.ts     # In-app events, notification preferences, due reminders
    push.ts              # Web Push delivery + stale subscription cleanup
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
  sw.js                  # Service worker (offline reading + push)
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
- Notes, exams, flashcards, doubts, resources and timetable actions are scoped on the server: everyone can read, but only the author (or an admin) can delete shared items. Grades are private to their owner. Resource pins, useful marks and read checklists are scoped to the signed-in member.
- Link previews require a session, are rate-limited, only accept public http(s) URLs, resolve and block private/link-local addresses, cap redirects and response size, and parse HTML metadata without storing the page.
- Browser push subscriptions are scoped to the signed-in member, require HTTPS endpoints on known browser push services, and are deleted when the push service reports them gone. Push failures never block the action that created the notification.
- Security headers and a Content-Security-Policy are set in `next.config.ts`.

## Tech choices (and why)

- **Polling chat instead of WebSockets** — zero extra infrastructure, perfectly fine for a small group. Polling pauses on hidden tabs.
- **Postgres** — works both locally and on serverless hosts like Vercel (SQLite can't persist on serverless).
- **scrypt from Node's crypto** — no external dependency needed for password hashing.
- **Lazy-loaded Recharts** — the charting library loads after first paint, keeping the dashboard's initial bundle small.

---

Made for a small group. Enjoy.
