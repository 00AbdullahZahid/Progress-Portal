import { requireUser } from "@/lib/auth";
import { PageHeader, Card, Button } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { AdminResetPanel } from "@/components/admin-reset-panel";
import { signOut } from "@/lib/actions/auth";
import { db } from "@/lib/db";
import { LogoutIcon } from "@/components/icons";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
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
          <AdminResetPanel members={members} />
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
