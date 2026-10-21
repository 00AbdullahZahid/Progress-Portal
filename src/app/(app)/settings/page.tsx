import { requireUser } from "@/lib/auth";
import { PageHeader, Card, Button } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { AdminResetPanel } from "@/components/admin-reset-panel";
import { signOut } from "@/lib/actions/auth";
import { db } from "@/lib/db";
import { LogoutIcon, ShieldIcon } from "@/components/icons";
import Link from "next/link";

const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default async function SettingsPage() {
  const me = await requireUser();
  const isAdmin = me.role === "admin";

  const members = isAdmin
    ? (
        await db.user.findMany({
          orderBy: [{ role: "desc" }, { name: "asc" }],
          select: { handle: true, name: true, role: true, color: true },
        })
      ).map((u) => ({ handle: u.handle, name: u.name, role: u.role, color: u.color }))
    : [];

  return (
    <div className="max-w-lg">
      <PageHeader title="Settings" subtitle="Your profile, password, and preferences." />

      <ProfileForm
        user={{ name: me.name, color: me.color, timezone: me.timezone }}
        timezones={TIMEZONES}
      />

      <div className="mt-6">
        <ChangePasswordForm />
      </div>

      {isAdmin ? (
        <div className="mt-6">
          <Card>
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldIcon width={18} height={18} className="text-amber-500" />
              Super admin
            </h2>
            <p className="mb-3 text-sm text-muted">
              Manage members, reset passwords, and edit anyone&apos;s details from the admin
              dashboard.
            </p>
            <Link href="/admin">
              <Button type="button" variant="outline">
                Open admin dashboard
              </Button>
            </Link>
          </Card>
          <div className="mt-6">
            <AdminResetPanel members={members} />
          </div>
        </div>
      ) : null}

      <Card className="mt-6">
        <h2 className="mb-1 font-semibold">Session</h2>
        <p className="mb-3 text-sm text-muted">
          Signed in as @{me.handle} ({isAdmin ? "super admin" : "member"}). Logging out clears
          this browser only.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            <LogoutIcon width={16} height={16} />
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
