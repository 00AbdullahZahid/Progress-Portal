import type { User } from "@prisma/client";

const sizes: Record<string, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export function Avatar({
  user,
  size = "md",
}: {
  user: Pick<User, "name" | "color">;
  size?: keyof typeof sizes;
}) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${sizes[size]}`}
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {initial}
    </span>
  );
}
