import type { PublicUser } from "@/lib/user";

const sizes: Record<string, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

/**
 * Pick dark or light initials for an arbitrary profile colour. White text is
 * unreadable on yellow/lime, so choose by relative luminance instead of
 * hardcoding white.
 */
function readableInk(hex: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return "#ffffff";
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  // sRGB relative luminance (WCAG); 0.55 is a safe switch-over point.
  const luminance =
    0.2126 * (r / 255) ** 2.2 +
    0.7152 * (g / 255) ** 2.2 +
    0.0722 * (b / 255) ** 2.2;
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
}

export function Avatar({
  user,
  size = "md",
}: {
  user: Pick<PublicUser, "name" | "color"> & { image?: string | null };
  size?: keyof typeof sizes;
}) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars are tiny, remote blobs
      <img
        src={user.image}
        alt={user.name}
        className={`inline-flex shrink-0 select-none rounded-full object-cover ${sizes[size]}`}
        title={user.name}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${sizes[size]}`}
      style={{ backgroundColor: user.color, color: readableInk(user.color) }}
      title={user.name}
    >
      {initial}
    </span>
  );
}
