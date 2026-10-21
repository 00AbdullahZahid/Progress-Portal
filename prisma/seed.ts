import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/security";

const prisma = new PrismaClient();

const ADMIN = {
  handle: "admin",
  name: "Super Admin",
  role: "admin",
  color: "#2563eb",
  password: "admin123",
  timezone: "Asia/Karachi",
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

  await prisma.user.upsert({
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

  // Ensure a default group chat channel exists (the app needs at least one).
  const existingChannel = await prisma.channel.findFirst({ where: { kind: "group" } });
  if (!existingChannel) {
    await prisma.channel.create({ data: { name: "General", kind: "group" } });
    console.log("Created default #General channel.");
  }

  console.log("Seed complete.");
  console.log("\nAccounts (change these after first login):");
  console.log(`  Super Admin  admin  /  ${ADMIN.password}`);
  for (const m of MEMBERS) console.log(`  ${m.name.padEnd(16)} ${m.handle.padEnd(10)} /  ${m.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
