"use server";

import { db } from "../db";
import { requireUser } from "../auth";

/**
 * Record that the signed-in user is currently active. Called by a lightweight
 * heartbeat so the dashboard can show who is around ("who's studying now").
 */
export async function pingPresence(): Promise<{ ok: true }> {
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: { lastSeenAt: new Date() },
  });
  return { ok: true };
}
