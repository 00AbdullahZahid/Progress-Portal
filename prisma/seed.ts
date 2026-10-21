import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";

const prisma = new PrismaClient();

const ADMIN = {
  handle: "admin",
  name: "Super Admin",
  role: "admin",
  color: "#6366f1",
  password: "admin123",
  timezone: "UTC",
};

const MEMBERS = [
  { handle: "alex", name: "Alex", color: "#f97316", password: "alex1234", timezone: "America/New_York" },
  { handle: "blake", name: "Blake", color: "#10b981", password: "blake123", timezone: "America/Chicago" },
  { handle: "casey", name: "Casey", color: "#8b5cf6", password: "casey123", timezone: "America/Denver" },
  { handle: "drew", name: "Drew", color: "#0ea5e9", password: "drew1234", timezone: "America/Los_Angeles" },
  { handle: "eva", name: "Eva", color: "#ec4899", password: "eva12345", timezone: "Europe/London" },
  { handle: "frank", name: "Frank", color: "#eab308", password: "frank123", timezone: "Asia/Kolkata" },
];

async function main() {
  console.log("Seeding users...");

  const admin = await prisma.user.upsert({
    where: { handle: ADMIN.handle },
    update: { role: "admin" },
    create: {
      handle: ADMIN.handle,
      name: ADMIN.name,
      role: "admin",
      color: ADMIN.color,
      timezone: ADMIN.timezone,
      passwordHash: hashPassword(ADMIN.password),
    },
  });

  for (const m of MEMBERS) {
    await prisma.user.upsert({
      where: { handle: m.handle },
      update: {},
      create: {
        handle: m.handle,
        name: m.name,
        role: "member",
        color: m.color,
        timezone: m.timezone,
        passwordHash: hashPassword(m.password),
      },
    });
  }

  const existing = await prisma.project.count();
  if (existing > 0) {
    console.log("Projects already exist, skipping sample data.");
    return;
  }

  console.log("Creating sample project, tasks, habits, chat...");
  const alex = await prisma.user.findUniqueOrThrow({ where: { handle: "alex" } });
  const blake = await prisma.user.findUniqueOrThrow({ where: { handle: "blake" } });
  const casey = await prisma.user.findUniqueOrThrow({ where: { handle: "casey" } });

  const project = await prisma.project.create({
    data: { name: "Group Portal Build" },
  });

  await prisma.channel.create({ data: { name: "General", kind: "group" } });

  const goal = await prisma.goal.create({
    data: {
      projectId: project.id,
      title: "Ship v1 of the portal to all members",
      targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21),
    },
  });

  const taskSeeds = [
    { title: "Set up the repo and deploy pipeline", status: "done", priority: "high", assigneeId: alex.id, goalId: goal.id },
    { title: "Design the dashboard layout", status: "done", priority: "med", assigneeId: casey.id, goalId: goal.id },
    { title: "Build the task board", status: "doing", priority: "high", assigneeId: alex.id, goalId: goal.id },
    { title: "Write habit streak logic", status: "doing", priority: "med", assigneeId: blake.id, goalId: goal.id },
    { title: "Pick a color palette everyone likes", status: "todo", priority: "low", assigneeId: null, goalId: goal.id },
    { title: "Decide on the group chat name", status: "todo", priority: "low", assigneeId: null, goalId: null },
  ];

  const tasks = [];
  for (const t of taskSeeds) {
    tasks.push(
      await prisma.task.create({
        data: {
          ...t,
          projectId: project.id,
          status: t.status,
          completedAt: t.status === "done" ? new Date() : null,
        },
      })
    );
  }

  await prisma.taskComment.create({
    data: {
      taskId: tasks[2].id,
      authorId: casey.id,
      body: "Love the progress so far — the board feels really clean.",
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const habitAlex = await prisma.habit.create({
    data: { ownerId: alex.id, name: "Deep work 1h" },
  });
  const habitBlake = await prisma.habit.create({
    data: { ownerId: blake.id, name: "Read 20 pages" },
  });
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    if (d !== today || i > 0) {
      await prisma.habitCheckIn.create({
        data: { habitId: habitAlex.id, date: d },
      });
    }
    if (i < 4) {
      await prisma.habitCheckIn.create({
        data: { habitId: habitBlake.id, date: d },
      });
    }
  }

  await prisma.studySession.create({
    data: { userId: casey.id, subject: "System Design", minutes: 90, date: today, notes: "Reviewed CAP theorem" },
  });
  await prisma.studySession.create({
    data: { userId: alex.id, subject: "React", minutes: 60, date: today, notes: "Server actions" },
  });

  const general = await prisma.channel.findFirstOrThrow({ where: { kind: "group" } });
  await prisma.message.create({
    data: { channelId: general.id, authorId: alex.id, body: "Welcome to the portal, everyone!" },
  });
  await prisma.message.create({
    data: { channelId: general.id, authorId: casey.id, body: "This is so clean. Nice work." },
  });

  console.log("Seed complete.");
  console.log("\nAccounts (change these after first login):");
  console.log(`  Super Admin  admin  /  ${ADMIN.password}`);
  for (const m of MEMBERS) console.log(`  ${m.name.padEnd(12)} ${m.handle.padEnd(7)} /  ${m.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
