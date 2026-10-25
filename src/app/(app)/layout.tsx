import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Pass only what the client shell renders. Sending the whole Prisma User
  // would serialize passwordHash and tokenVersion into the RSC payload.
  return (
    <Shell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        color: user.color,
        image: user.image,
      }}
    >
      {children}
    </Shell>
  );
}
