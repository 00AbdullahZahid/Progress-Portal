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
