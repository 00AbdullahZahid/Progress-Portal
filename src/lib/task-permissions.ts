/**
 * Task permission rules shared by the tasks server actions. Kept outside the
 * "use server" module because every export there must be an async action.
 */

/** Admins and the creator may edit every field. Legacy tasks have no creator. */
export function canEditTask(
  user: { id: string; role: string },
  task: { createdById: string | null }
): boolean {
  return (
    user.role === "admin" ||
    task.createdById === user.id ||
    task.createdById === null
  );
}

/**
 * Deleting is stricter than editing: legacy tasks without a creator stay
 * admin-only so an old shared task cannot be removed by accident.
 */
export function canDeleteTask(
  user: { id: string; role: string },
  task: { createdById: string | null }
): boolean {
  return user.role === "admin" || task.createdById === user.id;
}
