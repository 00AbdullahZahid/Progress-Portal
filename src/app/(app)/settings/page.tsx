import { requireUser, createCalendarTokenForUser } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PreferencesForm } from "@/components/preferences-form";
import { NotificationSettings } from "@/components/notification-settings";
import { DeviceNotificationSettings } from "@/components/device-notification-settings";
import { CalendarFeed } from "@/components/calendar-feed";
import { AppearanceSettings } from "@/components/appearance-settings";
import { TutorialPreference } from "@/components/tutorial";
import { LogoutButton } from "@/components/logout-button";
import { supportedTimezones } from "@/lib/validation";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

const COMMON_TIMEZONES = [
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

  // Only offer timezones this runtime actually supports, common ones first,
  // and always include whatever the user currently has.
  const all = supportedTimezones();
  const timezones = [
    ...COMMON_TIMEZONES.filter((tz) => all.includes(tz)),
    ...all.filter((tz) => !COMMON_TIMEZONES.includes(tz)),
  ];
  if (!timezones.includes(me.timezone)) timezones.unshift(me.timezone);

  const token = await createCalendarTokenForUser(me.id);
  if (!token) redirect("/login?expired=1");
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProto = (requestHeaders.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const proto =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.startsWith("localhost")
        ? "http"
        : "https";
  const calendarUrl = `${proto}://${host}/api/calendar?token=${encodeURIComponent(token)}`;

  const sections = [
    { id: "appearance", label: "Appearance" },
    { id: "profile", label: "Profile" },
    { id: "password", label: "Password" },
    { id: "goals", label: "Goals & notifications" },
    { id: "notifications", label: "Notification events" },
    { id: "phone", label: "Phone alerts" },
    { id: "calendar", label: "Calendar" },
    { id: "tutorial", label: "Tutorial" },
    { id: "session", label: "Session" },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Your profile, password, and preferences." />

      <nav
        aria-label="Settings sections"
        className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div id="appearance" className="scroll-mt-24">
        <AppearanceSettings />
      </div>

      <div id="profile" className="mt-6 scroll-mt-24">
        <ProfileForm
          user={{ name: me.name, color: me.color, timezone: me.timezone, image: me.image }}
          timezones={timezones}
        />
      </div>

      <div id="password" className="mt-6 scroll-mt-24">
        <ChangePasswordForm />
      </div>

      <div id="goals" className="mt-6 scroll-mt-24">
        <PreferencesForm
          weeklyGoalMinutes={me.weeklyGoalMinutes}
          notifyTasks={me.notifyTasks}
          notifyExams={me.notifyExams}
        />
      </div>

      <div id="notifications" className="mt-6 scroll-mt-24">
        <NotificationSettings
          initial={{
            notifyTaskAssigned: me.notifyTaskAssigned,
            notifyTaskComments: me.notifyTaskComments,
            notifyTaskStatus: me.notifyTaskStatus,
            notifyTaskDue: me.notifyTaskDue,
            notifyNewProjects: me.notifyNewProjects,
            notifyChatMentions: me.notifyChatMentions,
            notifyExamReminders: me.notifyExamReminders,
            notifyPush: me.notifyPush,
          }}
          pushPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        />
      </div>

      <div id="phone" className="mt-6 scroll-mt-24">
        <DeviceNotificationSettings />
      </div>

      <div id="calendar" className="mt-6 scroll-mt-24">
        <CalendarFeed url={calendarUrl} />
      </div>

      <div id="tutorial" className="mt-6 scroll-mt-24">
        <Card>
          <h2 className="mb-1 font-semibold">Tutorial and feature guide</h2>
          <p className="mb-3 text-sm text-muted">
            New here, or need a refresher? The tour walks through each area of the portal.
          </p>
          <TutorialPreference />
        </Card>
      </div>

      {isAdmin ? (
        <p className="mt-4 text-xs text-muted">
          Admin tools now live in the{" "}
          <Link href="/admin" className="font-medium text-brand hover:underline">
            Admin tab
          </Link>
          .
        </p>
      ) : null}

      <div id="session" className="scroll-mt-24">
        <Card className="mt-6">
          <h2 className="mb-1 font-semibold">Session</h2>
          <p className="mb-3 text-sm text-muted">
            Signed in as @{me.handle} ({isAdmin ? "super admin" : "member"}). Logging out clears
            this browser only.
          </p>
                    <LogoutButton variant="inline" />
        </Card>
      </div>
    </div>
  );
}
