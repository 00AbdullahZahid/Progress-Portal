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
  { handle: "abdullah", name: "Abdullah Zahid", color: "#f97316", password: "abdullah123", timezone: "Asia/Karachi" },
  { handle: "eman", name: "Eman", color: "#10b981", password: "eman12345", timezone: "Asia/Karachi" },
  { handle: "haram", name: "Haram", color: "#8b5cf6", password: "haram1234", timezone: "Asia/Karachi" },
  { handle: "mahnoor", name: "Mahnoor", color: "#0ea5e9", password: "mahnoor123", timezone: "Asia/Karachi" },
  { handle: "ateeb", name: "Muhammad Ateeb", color: "#ec4899", password: "ateeb1234", timezone: "Asia/Karachi" },
  { handle: "muizz", name: "Rana Muizz", color: "#eab308", password: "muizz1234", timezone: "Asia/Karachi" },
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
  const abdullah = await prisma.user.findUniqueOrThrow({ where: { handle: "abdullah" } });
  const eman = await prisma.user.findUniqueOrThrow({ where: { handle: "eman" } });
  const haram = await prisma.user.findUniqueOrThrow({ where: { handle: "haram" } });
  const mahnoor = await prisma.user.findUniqueOrThrow({ where: { handle: "mahnoor" } });
  const ateeb = await prisma.user.findUniqueOrThrow({ where: { handle: "ateeb" } });
  const muizz = await prisma.user.findUniqueOrThrow({ where: { handle: "muizz" } });

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
    { title: "Set up the repo and deploy pipeline", status: "done", priority: "high", assigneeId: abdullah.id, goalId: goal.id },
    { title: "Design the dashboard layout", status: "done", priority: "med", assigneeId: mahnoor.id, goalId: goal.id },
    { title: "Build the task board", status: "doing", priority: "high", assigneeId: abdullah.id, goalId: goal.id },
    { title: "Write habit streak logic", status: "doing", priority: "med", assigneeId: eman.id, goalId: goal.id },
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
      authorId: mahnoor.id,
      body: "Love the progress so far — the board feels really clean.",
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const habitAbdullah = await prisma.habit.create({
    data: { ownerId: abdullah.id, name: "Deep work 1h" },
  });
  const habitEman = await prisma.habit.create({
    data: { ownerId: eman.id, name: "Read 20 pages" },
  });
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    if (d !== today || i > 0) {
      await prisma.habitCheckIn.create({
        data: { habitId: habitAbdullah.id, date: d },
      });
    }
    if (i < 4) {
      await prisma.habitCheckIn.create({
        data: { habitId: habitEman.id, date: d },
      });
    }
  }

  await prisma.studySession.create({
    data: { userId: mahnoor.id, subject: "System Design", minutes: 90, date: today, notes: "Reviewed CAP theorem" },
  });
  await prisma.studySession.create({
    data: { userId: abdullah.id, subject: "React", minutes: 60, date: today, notes: "Server actions" },
  });

  const general = await prisma.channel.findFirstOrThrow({ where: { kind: "group" } });
  await prisma.message.create({
    data: { channelId: general.id, authorId: abdullah.id, body: "Welcome to the portal, everyone!" },
  });
  await prisma.message.create({
    data: { channelId: general.id, authorId: mahnoor.id, body: "This is so clean. Nice work." },
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
