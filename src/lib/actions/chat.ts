"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { requireUser } from "../auth";

export async function postMessage(formData: FormData) {
  "use server";
  const me = await requireUser();
  const channelId = String(formData.get("channelId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!channelId || !body) return;
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  if (!channel) return;
  await db.message.create({
    data: { channelId, authorId: me.id, body: body.slice(0, 4000) },
  });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
}

export async function editMessage(formData: FormData) {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!messageId || !body) return;
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return;
  // Only the author can edit their own message.
  if (message.authorId !== me.id) return;
  await db.message.update({
    where: { id: messageId },
    data: { body: body.slice(0, 4000) },
  });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
}

export async function deleteMessage(formData: FormData) {
  "use server";
  const me = await requireUser();
  const messageId = String(formData.get("messageId") ?? "");
  if (!messageId) return;
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return;
  // Author can delete their own; admin can delete any.
  if (message.authorId !== me.id && me.role !== "admin") return;
  await db.message.delete({ where: { id: messageId } });
  revalidatePath("/chat");
  revalidatePath("/api/chat");
}
