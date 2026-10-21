"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";
import type { ActionResult } from "./tasks";

export async function postMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!channelId || !body) return { ok: false, error: "Message cannot be empty." };
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return { ok: false, error: "Channel not found." };
  await db.message.create({
    data: { channelId, authorId: me.id, body: body.slice(0, 4000) },
  });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
  return { ok: true };
}

export async function editMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!messageId || !body) return { ok: false, error: "Message cannot be empty." };
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return { ok: false, error: "Message not found." };
  // Only the author can edit their own message.
  if (message.authorId !== me.id)
    return { ok: false, error: "You can only edit your own messages." };
  await db.message.update({
    where: { id: messageId },
    data: { body: body.slice(0, 4000) },
  });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
  return { ok: true };
}

export async function deleteMessage(formData: FormData): Promise<ActionResult> {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  if (!messageId) return { ok: false, error: "Message not found." };
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return { ok: false, error: "Message not found." };
  // Author can delete their own; admin can delete any.
  if (message.authorId !== me.id && me.role !== "admin")
    return { ok: false, error: "You do not have permission to delete this message." };
  await db.message.delete({ where: { id: messageId } });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
  return { ok: true };
}
