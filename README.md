# Group Portal

A private web app for a small group to track **tasks and goals**, **habits**, and **study sessions**, and to **chat** — all in one place with a shared analytics dashboard.

Built with **Next.js 15 (App Router) + TypeScript**, **Tailwind CSS v4**, **Prisma + Postgres**, and **Recharts**.

---

## Features

- **Members and auth** — Invite-only. Username + password login (scrypt-hashed). One or more **super admin** accounts.
- **Super admin** — Admins can add, deactivate, reactivate, and delete users; edit anyone's details (name, username, color, timezone, role); and reset any member's password. Creating and deleting projects, goals, tasks, and chat channels is admin-only, enforced on the server.
- **Admin dashboard** — A dedicated super-admin page with group stats, a user manager, and recent audit activity.
- **Tasks and projects** — Projects, goals, and tasks with status columns (todo / doing / done), assignees, priorities, due dates, and progress bars. Assignees (and admins) can move a task's status.
- **Comments** — Comment threads on any task.
- **Habits and check-ins** — Daily habit grid with streaks that keep counting past the current record.
- **Study log** — Log sessions (subject, minutes, notes, date) with per-subject progress bars and inline editing.
- **Group chat** — Real-time-ish chat with polling (no extra infra needed). Messages can be edited by their author and deleted by the author or an admin; edits and deletes sync into other open windows.
- **Dashboard** — 7-day leaderboard, tasks-completed chart, study-minutes chart, study-by-person breakdown, and quick links to every section. Charts load lazily so the first paint stays fast.
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
```

`.env` is git-ignored. Only `.env.example` (placeholders) is committed.

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

1. In the Vercel project, add environment variables: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `APP_URL`, and `ADMIN_HANDLES` (leave `SEED_ADMIN_PASSWORD` unset unless you want a known password).
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
  schema.prisma          # Data model (User, Project, Goal, Task, Habit, StudySession, Channel, Message, AuditLog)
  migrations/            # Prisma migrations
  seed.ts                # Seeds admin(s) + default chat channel (no real names, no sample data)
src/
  app/
    (app)/               # Authenticated pages (dashboard, admin, tasks, habits, study, chat, people, settings)
    api/chat/            # Chat polling endpoint
    login/               # Login page
    error.tsx            # Route error boundary
    not-found.tsx        # 404 page
  components/            # UI components (icons, task-board, habit-tracker, chat-window, charts, etc.)
  lib/
    actions/             # Server actions (mutations)
    auth.ts              # Session handling (JWT cookie), role checks, cache()
    db.ts                # Prisma client
    dates.ts             # Timezone-aware date + streak helpers
    security.ts          # Password hashing (scrypt)
    validation.ts        # Shared input validation
    rate-limit.ts        # Login attempt throttling
    audit.ts             # Admin action audit logging
  middleware.ts          # Cookie-presence auth gate for app routes
```

## Security notes

- Passwords are hashed with scrypt and verified in constant time. Login attempts are rate-limited.
- Sessions are signed JWTs in an httpOnly cookie. Deactivating a user or resetting their password invalidates existing sessions (token versioning).
- The production build refuses to start without a `AUTH_SECRET`.
- Admin-only actions (projects, goals, tasks, channels, user management, password resets) are enforced on the server, not just hidden in the UI.
- Admin mutations are recorded in an `AuditLog` and visible on the Admin page.
- Habit and study actions are scoped to the current user.
- Security headers and a Content-Security-Policy are set in `next.config.ts`.

## Tech choices (and why)

- **Polling chat instead of WebSockets** — zero extra infrastructure, perfectly fine for a small group. Polling pauses on hidden tabs.
- **Postgres** — works both locally and on serverless hosts like Vercel (SQLite can't persist on serverless).
- **scrypt from Node's crypto** — no external dependency needed for password hashing.
- **Lazy-loaded Recharts** — the charting library loads after first paint, keeping the dashboard's initial bundle small.

---

Made for a small group. Enjoy.
