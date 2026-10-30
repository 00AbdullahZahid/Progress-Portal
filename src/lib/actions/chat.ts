"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import { cleanText } from "../validation";
import { rateLimit } from "../rate-limit";
import { queueWebhookAlert } from "../alerts";
import { mentionedHandles } from "../mentions";
import { notifyUsers } from "../notifications";
import type { ActionResult } from "./tasks";

/**
 * Called when the chat page opens. It only moves the member's own read marker,
 * which clears the bottom-nav badge without touching other people's state.
 */
export async function markChatRead(): Promise<void> {
  "use server";
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: { chatReadAt: new Date() },
  });
}

export async function postMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();

  // Chat is polled, so a stuck client can retry quickly. Keep one member from
  // flooding a channel while still allowing normal conversation.
  const limit = rateLimit(`chat:${me.id}`, 10, 10_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `You're sending messages too quickly. Try again in ${limit.retryAfterSeconds}s.`,
    };
  }

  const channelId = String(formData.get("channelId") ?? "");
  const bodyRes = cleanText(formData.get("body"), 4000);
  if (!bodyRes.ok) return bodyRes;

  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { ok: false, error: "Channel not found." };

  const msg = await db.message.create({
    data: { channelId, authorId: me.id, body: bodyRes.value },
  });

  try {
    const mentions = mentionedHandles(bodyRes.value, me.handle);
    if (mentions.length > 0) {
      const mentioned = await db.user.findMany({
        where: { handle: { in: mentions }, isActive: true },
        select: { id: true, handle: true, name: true },
      });
      if (mentioned.length > 0) {
        const excerpt = bodyRes.value.replace(/\s+/g, " ").slice(0, 160);
        await notifyUsers({
          audience: mentioned.map((u) => u.id),
          kind: "chat_mention",
          title: `${me.name} mentioned you in #${channel.name}`,
          body: excerpt,
          href: `/chat?ch=${channelId}`,
          excludeUserId: me.id,
          dedupeKey: `chat_mention:${msg.id}`,
        });
        queueWebhookAlert(
          `Mention in #${channel.name}\n${me.name} mentioned ${mentioned
            .map((u) => `@${u.handle}`)
            .join(", ")}\n${bodyRes.value.slice(0, 400)}`
        );
      }
    }
  } catch {
    // An alert failure must never make a successfully posted message look
    // like it failed and invite the sender to post it again.
  }

  revalidatePath("/chat");
  return { ok: true };
}

export async function editMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  const bodyRes = cleanText(formData.get("body"), 4000);
  if (!bodyRes.ok) return bodyRes;

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return { ok: false, error: "Message not found." };
  if (message.authorId !== me.id)
    return { ok: false, error: "You can only edit your own messages." };

  const previousMentions = mentionedHandles(message.body, me.handle);
  const nextMentions = mentionedHandles(bodyRes.value, me.handle);

  await db.message.update({
    where: { id: messageId },
    data: { body: bodyRes.value },
  });

  try {
    // Remove notifications for mentions that were deleted in the edit.
    const removed = previousMentions.filter((h) => !nextMentions.includes(h));
    if (removed.length > 0) {
      const mentionedUsers = await db.user.findMany({
        where: { handle: { in: removed }, isActive: true },
        select: { id: true },
      });
      if (mentionedUsers.length > 0) {
        await db.notification.deleteMany({
          where: {
            kind: "chat_mention",
            userId: { in: mentionedUsers.map((u) => u.id) },
            dedupeKey: `chat_mention:${messageId}`,
          },
        });
      }
    }

    // Notify newly added mentions (if any).
    const added = nextMentions.filter((h) => !previousMentions.includes(h));
    if (added.length > 0) {
      const channel = await db.channel.findUnique({
        where: { id: message.channelId },
      });
      if (channel) {
        const mentioned = await db.user.findMany({
          where: { handle: { in: added }, isActive: true },
          select: { id: true, handle: true, name: true },
        });
        if (mentioned.length > 0) {
          const excerpt = bodyRes.value.replace(/\s+/g, " ").slice(0, 160);
          await notifyUsers({
            audience: mentioned.map((u) => u.id),
            kind: "chat_mention",
            title: `${me.name} mentioned you in #${channel.name}`,
            body: excerpt,
            href: `/chat?ch=${channel.id}`,
            excludeUserId: me.id,
            dedupeKey: `chat_mention:${messageId}`,
          });
        }
      }
    }
  } catch {
    // Ignore notification errors on edit.
  }

  revalidatePath("/chat");
  return { ok: true };
}

export async function deleteMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  if (!messageId) return { ok: false, error: "Message not found." };

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return { ok: false, error: "Message not found." };
  if (message.authorId !== me.id && me.role !== "admin")
    return { ok: false, error: "You don't have permission to delete this message." };

  await db.$transaction([
    db.notification.deleteMany({
      where: {
        kind: "chat_mention",
        dedupeKey: { startsWith: `chat_mention:${messageId}:` },
      },
    }),
    db.message.delete({ where: { id: messageId } }),
  ]);
  revalidatePath("/chat");
  return { ok: true };
}

