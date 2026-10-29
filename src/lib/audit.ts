import { db } from "./db";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.deactivate"
  | "user.activate"
  | "user.delete"
  | "user.password_reset"
  | "user.password_change"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "goal.create"
  | "goal.update"
  | "goal.delete"
  | "task.create"
  | "task.update"
  | "task.delete"
  | "channel.create";

/**
 * Record an admin or account action. Never throws — auditing must not break
 * the action it is logging.
 */
export async function audit(
  actorId: string | null,
  action: AuditAction,
  opts: { targetId?: string | null; detail?: string } = {}
) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        targetId: opts.targetId ?? null,
        detail: opts.detail ? opts.detail.slice(0, 500) : null,
      },
    });
  } catch {
    // Swallow: logging must never take down the request.
  }
}
