# Group Portal

A private web app for a small group to track **tasks and goals**, **habits**, and **study sessions**, and to **chat** — all in one place with a shared analytics dashboard.

Built with **Next.js 15 (App Router) + TypeScript**, **Tailwind CSS v4**, **Prisma + Postgres**, and **Recharts**.

---

## Features

- **Members and auth** — Invite-only. Username + password login (scrypt-hashed). One **super admin** account.
- **Super admin** — The admin can reset any member's password, and is the only one who can add projects, goals, and tasks. Everyone else can update task statuses and comment.
- **Tasks and projects** — Projects, goals, and tasks with status columns (todo / doing / done), assignees, priorities, due dates, and progress bars.
- **Comments** — Comment threads on any task.
- **Habits and check-ins** — Daily habit grid with streaks.
- **Study log** — Log sessions (subject, minutes, notes) with per-subject progress bars.
- **Group chat** — Real-time-ish chat with polling (no extra infra needed).
- **Dashboard** — Leaderboard, tasks-completed chart, study-minutes chart, and study-by-person breakdown.
- **Collapsible sidebar** — Collapse the nav to icons; it remembers your preference.
- **Polish** — Dark mode, mobile-first responsive layout, SVG icons throughout.

## Accounts

After seeding, these accounts are created (passwords shown are the defaults — change them after first login):

| Role         | Username   | Password      |
|--------------|------------|---------------|
| Super Admin  | `admin`    | `admin123`    |
| Member       | `abdullah` | `abdullah123` |
| Member       | `eman`     | `eman12345`   |
| Member       | `haram`    | `haram1234`   |
| Member       | `mahnoor`  | `mahnoor123`  |
| Member       | `ateeb`    | `ateeb1234`   |
| Member       | `muizz`    | `muizz1234`   |

To rename members or change colors, edit `prisma/seed.ts` and re-seed, or just use the **Settings** page in the app.

The super admin can reset anyone's password from **Settings > Reset a member's password**. Members change their own password from **Settings > Change your password**.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (applies migrations and seeds)
npx prisma migrate deploy
npx prisma db seed

# 3. Run in development
npm run dev
```

Open **http://localhost:3000**, sign in as `admin` / `admin123`, and you're in.

### Production

```bash
npm run build
npm run start
```

## Environment

Copy `.env.example` to `.env` and set:

```
DATABASE_URL="postgresql://..."   # Postgres connection string (see below)
AUTH_SECRET="long-random-hex"     # used to sign session cookies
APP_URL="http://localhost:3000"
```

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database (Postgres)

This app uses **Postgres** so it can run both locally and on Vercel (SQLite does not work on serverless hosts).

1. Create a free Postgres database — for example [Neon](https://neon.tech) or Vercel's Postgres integration.
2. Put the **pooled** connection string in `DATABASE_URL` (Vercel's integration calls it `POSTGRES_PRISMA_URL`).
3. Create the tables:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed the admin and members:
   ```bash
   npx prisma db seed
   ```

### Deploying to Vercel

1. In the Vercel project, add environment variables: `DATABASE_URL` (pooled Postgres URL), `AUTH_SECRET`, and `APP_URL`.
2. Deploy. The `postinstall` script runs `prisma generate` automatically.
3. Run the schema against the production database (locally, with the prod `DATABASE_URL` in `.env`):
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

## Project structure

```
prisma/
  schema.prisma          # Data model (User, Project, Goal, Task, Habit, StudySession, Channel, Message)
  seed.ts                # Seeds the admin, members, and sample data
src/
  app/
    (app)/               # Authenticated pages (dashboard, tasks, habits, study, chat, people, settings)
    api/chat/            # Chat polling endpoint
    login/               # Login page
  components/            # UI components (icons, task-board, habit-tracker, chat-window, charts, etc.)
  lib/
    actions/             # Server actions (mutations)
    auth.ts              # Session handling (JWT cookie) + role checks
    db.ts                # Prisma client
    dates.ts             # Timezone-aware date + streak helpers
    security.ts          # Password hashing (scrypt)
```

## Security notes

- Passwords are hashed with scrypt and verified in constant time.
- Sessions are signed JWTs in an httpOnly cookie (30-day expiry).
- Task/project/goal creation and deletion are enforced as admin-only on the server, not just hidden in the UI.
- Habit and study actions are scoped to the current user.
- Password resets require the super admin session.

## Tech choices (and why)

- **Polling chat instead of WebSockets** — zero extra infrastructure, perfectly fine for a small group.
- **Postgres** — works both locally and on serverless hosts like Vercel (SQLite can't persist on serverless).
- **scrypt from Node's crypto** — no external dependency needed for password hashing.

---

Made for a small group. Enjoy.
