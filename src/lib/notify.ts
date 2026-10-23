import { db } from "./db";
import { todayStr, dateInTz } from "./dates";

type DigestItem = { user: string; lines: string[] };

/**
 * Build a short plain-text digest of what is due soon, per member who has
 * notifications enabled. Used by the daily cron route.
 */
export async function buildDigest(): Promise<{ text: string; items: DigestItem[] }> {
  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, timezone: true, notifyTasks: true, notifyExams: true },
  });

  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 86_400_000);

  const items: DigestItem[] = [];

  for (const u of users) {
    const lines: string[] = [];
    const today = todayStr(u.timezone);

    if (u.notifyTasks) {
      const tasks = await db.task.findMany({
        where: {
          assigneeId: u.id,
          status: { not: "done" },
          dueDate: { not: null, lte: soon },
        },
        orderBy: { dueDate: "asc" },
        select: { title: true, dueDate: true },
        take: 10,
      });
      for (const t of tasks) {
        if (!t.dueDate) continue;
        const due = dateInTz(t.dueDate, u.timezone);
        const label = due < today ? "overdue" : due === today ? "due today" : `due ${due}`;
        lines.push(`Task: ${t.title} (${label})`);
      }
    }

    if (u.notifyExams) {
      const exams = await db.exam.findMany({
        where: { date: { gte: today, lte: soon.toISOString().slice(0, 10) } },
        orderBy: { date: "asc" },
        select: { title: true, subject: true, kind: true, date: true },
        take: 10,
      });
      for (const e of exams) {
        lines.push(`${e.kind}: ${e.title} (${e.subject}) on ${e.date}`);
      }
    }

    if (lines.length > 0) items.push({ user: u.name, lines });
  }

  const text =
    items.length === 0
      ? "No tasks or exams due in the next 3 days."
      : items
          .map((i) => `${i.user}\n` + i.lines.map((l) => `  - ${l}`).join("\n"))
          .join("\n\n");

  return { text, items };
}

/** Discord rejects messages longer than this, so we split before sending. */
const DISCORD_LIMIT = 2000;

/** Break text into chunks no longer than `limit`, preferring line boundaries. */
export function chunkText(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    // A single line longer than the limit is hard-split.
    if (line.length > limit) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < line.length; i += limit) {
        chunks.push(line.slice(i, i + limit));
      }
      continue;
    }
    if (current && current.length + 1 + line.length > limit) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Send the digest to a webhook. Supports Discord ({"content"}) and Telegram
 * (chat_id + text) in addition to a generic {"text"} endpoint.
 *
 * Mentions are always suppressed: task and exam titles are user-entered, so a
 * title containing "@everyone" must not ping the whole channel.
 */
export async function sendDigest(text: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NOTIFY_WEBHOOK_URL;
  if (!url) return { ok: false, error: "NOTIFY_WEBHOOK_URL not set" };

  const isDiscord = url.includes("discord.com") || url.includes("discordapp.com");
  const isTelegram = url.includes("api.telegram.org");

  // Discord's hard limit; split into several messages when the digest is big.
  const parts = isDiscord ? chunkText(text, DISCORD_LIMIT) : [text];

  try {
    for (const part of parts) {
      let body: Record<string, unknown> = { text: part };
      if (isDiscord) {
        body = {
          content: part,
          // Never let a user-entered title ping @everyone/@here/roles.
          allowed_mentions: { parse: [] },
        };
      } else if (isTelegram) {
        const chatId = process.env.NOTIFY_TELEGRAM_CHAT_ID;
        if (!chatId) return { ok: false, error: "NOTIFY_TELEGRAM_CHAT_ID not set" };
        body = { chat_id: chatId, text: part, disable_notification: false };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { ok: false, error: `webhook responded ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "webhook request failed" };
  }
}
