import type { Prisma } from "@prisma/client";

/**
 * The only user fields that may be sent to a client component or shown to
 * another member. Keeping these selects in one place makes it hard to add a
 * `passwordHash` or `tokenVersion` to a page by accident.
 */
export const publicUserSelect = {
  id: true,
  handle: true,
  name: true,
  role: true,
  color: true,
  image: true,
} satisfies Prisma.UserSelect;

/** Public identity plus the fields only the admin user manager needs. */
export const managedUserSelect = {
  ...publicUserSelect,
  timezone: true,
  isActive: true,
} satisfies Prisma.UserSelect;

/** Public identity plus presence state for the dashboard widget. */
export const presenceUserSelect = {
  ...publicUserSelect,
  lastSeenAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;
