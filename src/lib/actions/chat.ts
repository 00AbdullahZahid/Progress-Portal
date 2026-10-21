"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser, requireAdmin } from "../auth";
import { cleanText } from "../validation";
import { audit } from "../audit";
import type { ActionResult } from "./tasks";

export async function postMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");
  const bodyRes = cleanText(formData.get("body"), 4000);
  if (!bodyRes.ok) return bodyRes;

  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { ok: false, error: "Channel not found." };

  await db.message.create({
    data: { channelId, authorId: me.id, body: bodyRes.value },
  });
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

  await db.message.update({
    where: { id: messageId },
    data: { body: bodyRes.value },
  });
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

  await db.message.delete({ where: { id: messageId } });
  revalidatePath("/chat");
  return { ok: true };
}

export async function createChannel(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireAdmin();
  const nameRes = cleanText(formData.get("name"), 60);
  if (!nameRes.ok) return nameRes;

  const existing = await db.channel.findFirst({
    where: { name: { equals: nameRes.value, mode: "insensitive" } },
  });
  if (existing) return { ok: false, error: "A channel with that name already exists." };

  const channel = await db.channel.create({
    data: { name: nameRes.value, kind: "group" },
  });
  await audit(me.id, "channel.create", {
    targetId: channel.id,
    detail: channel.name,
  });

  revalidatePath("/chat");
  return { ok: true };
}
