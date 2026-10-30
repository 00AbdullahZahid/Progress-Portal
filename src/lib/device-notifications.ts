/**
 * Device notifications for the installed Android app.
 *
 * FreeWebToApk/AppMint exposes a `window.WebToApk` bridge with rich
 * notifications and on-device scheduling. Browsers fall back to the standard
 * Notification API (service worker first, then `new Notification`). Every
 * helper is safe to call during SSR and does nothing outside a supporting
 * environment.
 */

type DeviceNotificationPayload = {
  title: string;
  body?: string | null;
  href?: string | null;
  tag?: string;
  important?: boolean;
};

type WebToApkBridge = {
  notify?: (json: string) => boolean;
  showNotification?: (title: string, body?: string, icon?: string, tag?: string) => void;
  requestNotificationPermission?: () => void;
  scheduleNotification?: (
    id: string,
    title: string,
    body: string,
    timestamp: string,
    repeat: string
  ) => boolean;
  cancelNotification?: (id: string) => boolean;
  getScheduledNotifications?: () => string;
};

type NotificationState = "granted" | "prompt" | "blocked" | "unavailable";

type AppMintBridge = {
  getNotificationState?: () => Promise<NotificationState>;
  enableNotifications?: () => Promise<{
    state?: NotificationState;
    changed?: boolean;
    openedSettings?: boolean;
  }>;
  openNotificationSettings?: () => void;
};

declare global {
  interface Window {
    WebToApk?: WebToApkBridge;
    AppMint?: AppMintBridge;
  }
}

export const DEVICE_NOTIFY_EVENT = "portal-device-notify-change";
const ENABLED_KEY = "portal-device-notifications";
const REMINDERS_KEY = "portal-device-reminders";
const SCHEDULED_KEY = "portal-scheduled-reminders";
const LAST_SYNC_KEY = "portal-reminders-synced-on";

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the setting still works for this visit.
  }
}

function bridge(): WebToApkBridge | undefined {
  return typeof window === "undefined" ? undefined : window.WebToApk;
}

/** True when this device can show a notification, in-app or in the browser. */
export function isDeviceNotifyAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    bridge()?.notify ||
      bridge()?.showNotification ||
      (typeof Notification !== "undefined" && "Notification" in window)
  );
}

/** True inside the APK wrapper that supports scheduled reminders. */
export function isReminderSyncAvailable(): boolean {
  return Boolean(bridge()?.scheduleNotification && bridge()?.cancelNotification);
}

/** Activity alerts are on by default; Settings can turn them off. */
export function isDeviceNotifyEnabled(): boolean {
  return storageGet(ENABLED_KEY) !== "0";
}

export function setDeviceNotifyEnabled(enabled: boolean) {
  storageSet(ENABLED_KEY, enabled ? "1" : "0");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_NOTIFY_EVENT));
  }
}

/** Scheduled due-date reminders are on by default inside the APK. */
export function isReminderSyncEnabled(): boolean {
  return storageGet(REMINDERS_KEY) !== "0";
}

export function setReminderSyncEnabled(enabled: boolean) {
  storageSet(REMINDERS_KEY, enabled ? "1" : "0");
  // Turning reminders off should also remove the ones already queued on the
  // phone, otherwise they keep firing for up to 30 days.
  if (!enabled) cancelScheduledReminders();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DEVICE_NOTIFY_EVENT));
  }
}

/**
 * Cancel only the reminders this app scheduled. The id list is kept locally, so
 * reminders from other features/builds are never touched.
 */
export function cancelScheduledReminders(): number {
  const native = bridge();
  if (!native?.cancelNotification) return 0;
  const previous = (storageGet(SCHEDULED_KEY) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  let cancelled = 0;
  for (const id of previous) {
    try {
      native.cancelNotification(id);
      cancelled += 1;
    } catch {
      // A missing id is fine.
    }
  }
  storageSet(SCHEDULED_KEY, "");
  storageSet(LAST_SYNC_KEY, "");
  return cancelled;
}

function appMint(): AppMintBridge | undefined {
  return typeof window === "undefined" ? undefined : window.AppMint;
}

function fromAppMintState(
  state: NotificationState | undefined
): NotificationPermission | "unsupported" {
  if (state === "granted") return "granted";
  if (state === "blocked") return "denied";
  if (state === "unavailable") return "unsupported";
  return "default";
}

/**
 * Exact permission state when the AppMint wrapper exposes it, otherwise the
 * browser answer. Run this on mount so the Settings card is not lying about a
 * blocked app.
 */
export async function getDevicePermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined") return "unsupported";
  const native = appMint();
  if (native?.getNotificationState) {
    try {
      return fromAppMintState(await native.getNotificationState());
    } catch {
      // Fall through to the generic checks.
    }
  }
  return devicePermission();
}

export function devicePermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!isDeviceNotifyAvailable()) return "unsupported";
  if (typeof Notification !== "undefined" && "permission" in Notification) {
    return Notification.permission;
  }
  // Bridge-only builds do not expose the permission state; assume allowed
  // until the system blocks the notification.
  return "granted";
}

/**
 * Ask for permission. Prefers AppMint's helper, which either shows the Android
 * prompt or opens the app's notification settings when Android will no longer
 * show it. Falls back to the browser prompt, then the raw WebToApk bridge.
 */
export async function requestDeviceNotifyPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined") return "unsupported";
  const native = appMint();

  if (native?.enableNotifications) {
    try {
      const result = await native.enableNotifications();
      return fromAppMintState(result?.state);
    } catch {
      // Fall through to the other bridges.
    }
  }

  if (typeof Notification !== "undefined" && "requestPermission" in Notification) {
    try {
      return await Notification.requestPermission();
    } catch {
      // Some WebViews expose the constructor but reject the promise.
    }
  }

  if (bridge()?.requestNotificationPermission) {
    try {
      bridge()!.requestNotificationPermission!();
      return "granted";
    } catch {
      return "denied";
    }
  }

  return isDeviceNotifyAvailable() ? "granted" : "unsupported";
}

/** Open the Android notification settings for this app, when supported. */
export function openDeviceNotificationSettings(): boolean {
  const native = appMint();
  if (!native?.openNotificationSettings) return false;
  try {
    native.openNotificationSettings();
    return true;
  } catch {
    return false;
  }
}

/** True when this browser has an active Web Push subscription that already delivers alerts. */
export async function hasBrowserPushSubscription(): Promise<boolean> {
  if (typeof window === "undefined" || bridge()) return false;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration || !("pushManager" in registration)) return false;
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}

export async function showDeviceNotification(
  payload: DeviceNotificationPayload
): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !isDeviceNotifyEnabled() ||
    !payload.title.trim()
  ) {
    return false;
  }

  const native = bridge();
  const body = payload.body?.trim() ?? "";
  const tag = payload.tag ?? "portal";
  const isImportant = payload.important || tag.includes("chat_mention");
  // Match the active app theme; Android notifications look wrong with a light
  // mark on a dark shade and vice versa.
  const dark = document.documentElement.classList.contains("dark");
  const icon = `${window.location.origin}${dark ? "/icon-dark-192.png" : "/icon-light-192.png"}`;

  // Try WebToApk/AppMint bridge FIRST - this is what the APK uses
  if (native?.notify) {
    try {
      const result = native.notify(
        JSON.stringify({
          title: payload.title,
          body,
          channel: isImportant ? "chat_mentions" : "messages",
          channelId: isImportant ? "chat_mentions" : "messages",
          tag,
          largeIcon: icon,
          smallIcon: icon,
          priority: isImportant ? "high" : "default",
          importance: isImportant ? "max" : "high",
          sound: "default",
          vibrate: isImportant ? [300, 200, 300] : [200, 100, 200],
          autoCancel: true,
          ongoing: false,
        })
      );
      if (result !== false) return true;
    } catch {
      // Fall through to next method
    }
  }

  if (native?.showNotification) {
    try {
      native.showNotification(payload.title, body, icon, tag);
      return true;
    } catch {
      // Fall through to standard API
    }
  }

  // For browser/PWA, check permission
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(payload.title, {
        body,
        icon,
        badge: icon,
        tag,
        data: { href: payload.href ?? "/dashboard" },
        requireInteraction: isImportant,
      } as NotificationOptions & { vibrate?: number[]; requireInteraction?: boolean });
      return true;
    }
  } catch {
    // A registration can exist without notification permission.
  }

  try {
    const notification = new Notification(payload.title, {
      body,
      icon,
      tag,
      data: { href: payload.href ?? "/dashboard" },
      requireInteraction: isImportant,
    });
    notification.onclick = () => {
      window.focus();
      if (payload.href) window.location.assign(payload.href);
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

type ReminderResponse = {
  tasks?: Array<{ id: string; title: string; dueDate: string }>;
  exams?: Array<{
    id: string;
    title: string;
    subject: string;
    kind: string;
    date: string;
  }>;
};

function examLabel(kind: string): string {
  return kind === "assignment"
    ? "Assignment"
    : kind === "quiz"
      ? "Quiz"
      : kind === "deadline"
        ? "Deadline"
        : "Exam";
}

/**
 * Schedule native reminders for upcoming tasks and exams. This runs only in the
 * APK bridge, at most once a day, and keeps its own id list so it never
 * cancels reminders scheduled by other parts of the app.
 */
export async function syncScheduledReminders({
  force = false,
}: { force?: boolean } = {}): Promise<{ scheduled: number; supported: boolean }> {
  if (typeof window === "undefined") return { scheduled: 0, supported: false };
  const native = bridge();
  if (!native?.scheduleNotification || !native.cancelNotification) {
    return { scheduled: 0, supported: false };
  }
  if (!isDeviceNotifyEnabled() || !isReminderSyncEnabled()) {
    return { scheduled: 0, supported: true };
  }

  const today = new Date().toLocaleDateString("en-CA");
  if (!force && storageGet(LAST_SYNC_KEY) === today) {
    return { scheduled: 0, supported: true };
  }

  let data: ReminderResponse;
  try {
    const res = await fetch("/api/reminders", { cache: "no-store" });
    if (!res.ok) return { scheduled: 0, supported: true };
    data = (await res.json()) as ReminderResponse;
  } catch {
    return { scheduled: 0, supported: true };
  }

  const now = Date.now();
  const next: Array<{ id: string; title: string; body: string; at: number }> = [];

  for (const task of data.tasks ?? []) {
    const due = new Date(task.dueDate).getTime();
    if (!Number.isFinite(due)) continue;
    // Warn an hour before, or five minutes from now for a task that is already
    // very close, so opening the app still schedules something useful.
    const at = Math.max(due - 60 * 60 * 1000, now + 5 * 60 * 1000);
    if (at > due + 60 * 60 * 1000) continue;
    next.push({
      id: `portal-task-${task.id}`,
      title: "Task due soon",
      body: task.title,
      at,
    });
  }

  for (const exam of data.exams ?? []) {
    // Exams are date-only: remind at 8am local on the day.
    const at = new Date(`${exam.date}T08:00:00`).getTime();
    if (!Number.isFinite(at) || at <= now + 60 * 1000) continue;
    next.push({
      id: `portal-exam-${exam.id}`,
      title: examLabel(exam.kind),
      body: `${exam.title} (${exam.subject})`,
      at,
    });
  }

  const capped = next.slice(0, 30);
  const nextIds = new Set(capped.map((item) => item.id));

  const previous = (storageGet(SCHEDULED_KEY) ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  for (const id of previous) {
    if (!nextIds.has(id)) {
      try {
        native.cancelNotification(id);
      } catch {
        // A missing id is fine.
      }
    }
  }

  let scheduled = 0;
  for (const item of capped) {
    try {
      const ok = native.scheduleNotification(
        item.id,
        item.title,
        item.body,
        String(item.at),
        "none"
      );
      if (ok !== false) scheduled += 1;
    } catch {
      // Skip this reminder; others should still be attempted.
    }
  }

  storageSet(SCHEDULED_KEY, [...nextIds].join(","));
  storageSet(LAST_SYNC_KEY, today);
  return { scheduled, supported: true };
}
