import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { hashPassword } from "../src/lib/security";

const prisma = new PrismaClient();

/**
 * Seed the database.
 *
 * No real names or passwords live in this file. The admin account is created
 * from environment variables, and members are added from the admin UI.
 *
 * Environment:
 *   ADMIN_HANDLES       comma-separated handles to create as admins (default: admin)
 *   SEED_ADMIN_PASSWORD optional password for the seeded admins. When unset a
 *                       strong random one is generated and printed once.
 *   SEED_MEMBERS        "1" to also create starter member accounts
 *                       (SEED_MEMBER_NAMES / SEED_MEMBER_HANDLES, comma-separated)
 */

function randomPassword(): string {
  return randomBytes(12).toString("base64url");
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const adminHandles = splitList(process.env.ADMIN_HANDLES);
  if (adminHandles.length === 0) adminHandles.push("admin");

  const sharedPassword = process.env.SEED_ADMIN_PASSWORD?.trim() || "";
  const created: { handle: string; password: string; printed: boolean }[] = [];

  console.log("Seeding admin account(s)...");

  for (const handle of adminHandles) {
    const existing = await prisma.user.findUnique({ where: { handle } });
    if (existing) {
      // Never overwrite an existing admin's password on re-seed.
      if (existing.role !== "admin") {
        await prisma.user.update({ where: { handle }, data: { role: "admin" } });
      }
      console.log(`  @${handle}: already exists, left unchanged.`);
      continue;
    }

    const password = sharedPassword || randomPassword();
    await prisma.user.create({
      data: {
        handle,
        name: "Super Admin",
        role: "admin",
        color: "#2563eb",
        timezone: "Asia/Karachi",
        passwordHash: await hashPassword(password),
      },
    });
    created.push({ handle, password, printed: true });
    console.log(`  @${handle}: created.`);
  }

  // Optional starter members for local development only.
  if (process.env.SEED_MEMBERS === "1") {
    const handles = splitList(process.env.SEED_MEMBER_HANDLES);
    const names = splitList(process.env.SEED_MEMBER_NAMES);
    console.log("Seeding starter members (dev only)...");
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      const existing = await prisma.user.findUnique({ where: { handle } });
      if (existing) {
        console.log(`  @${handle}: already exists, left unchanged.`);
        continue;
      }
      const password = randomPassword();
      await prisma.user.create({
        data: {
          handle,
          name: names[i] ?? handle,
          role: "member",
          color: "#0ea5e9",
          timezone: "Asia/Karachi",
          passwordHash: await hashPassword(password),
        },
      });
      created.push({ handle, password, printed: true });
      console.log(`  @${handle}: created.`);
    }
  }

  // Ensure a default group chat channel exists (the app needs at least one).
  const existingChannel = await prisma.channel.findFirst({ where: { kind: "group" } });
  if (!existingChannel) {
    await prisma.channel.create({ data: { name: "General", kind: "group" } });
    console.log("Created default #General channel.");
  }

  console.log("\nSeed complete.");

  if (created.length && !sharedPassword) {
    console.log("\nGenerated passwords — copy them now, they are shown only once:");
    for (const c of created) {
      console.log(`  @${c.handle.padEnd(14)} ${c.password}`);
    }
    console.log("\nShare each password privately and have them change it in Settings.");
  } else if (created.length) {
    console.log(`\nAll new accounts use the password from SEED_ADMIN_PASSWORD.`);
  } else {
    console.log("No new accounts were created.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
