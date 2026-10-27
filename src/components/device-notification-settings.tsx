"use client";

import { useEffect, useState } from "react";
import {
  devicePermission,
  getDevicePermission,
  isDeviceNotifyAvailable,
  isDeviceNotifyEnabled,
  isReminderSyncAvailable,
  isReminderSyncEnabled,
  openDeviceNotificationSettings,
  requestDeviceNotifyPermission,
  setDeviceNotifyEnabled,
  setReminderSyncEnabled,
  showDeviceNotification,
  syncScheduledReminders,
} from "@/lib/device-notifications";
import { Button, Card } from "./ui";
import { useToast } from "./toast";
import { BellIcon, CheckIcon, InfoIcon } from "./icons";

/**
 * Controls for notifications on the installable app (Android/WebView and
 * browsers). Reads everything after mount because permission, storage, and the
 * native bridge only exist on the client.
 */
export function DeviceNotificationSettings() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [available, setAvailable] = useState(false);
  const [reminders, setReminders] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [activity, setActivity] = useState(true);
  const [reminderSync, setReminderSync] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    setAvailable(isDeviceNotifyAvailable());
    setReminders(isReminderSyncAvailable());
    setPermission(devicePermission());
    setActivity(isDeviceNotifyEnabled());
    setReminderSync(isReminderSyncEnabled());
    void getDevicePermission().then((state) => {
      if (!cancelled) setPermission(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const result = await requestDeviceNotifyPermission();
      setPermission(result);
      if (result === "denied") {
        toast("Notifications are blocked. Allow them in your phone settings.", "error");
        return;
      }
      if (result === "unsupported") {
        toast("This device cannot show notifications.", "error");
        return;
      }
      if (result === "default") {
        toast("Finish enabling notifications in the settings screen that opened.", "info");
        return;
      }
      toast("Phone notifications enabled", "success");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const shown = await showDeviceNotification({
        title: "Group Portal",
        body: "Notifications are working on this device.",
        tag: "portal-test",
      });
      if (!shown) {
        toast("Could not show a notification. Check the permission first.", "error");
        return;
      }
      toast("Test notification sent", "success");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActivity(value: boolean) {
    setActivity(value);
    setDeviceNotifyEnabled(value);
    if (!value) toast("Activity alerts turned off", "info");
  }

  async function toggleReminders(value: boolean) {
    setReminderSync(value);
    setReminderSyncEnabled(value);
    if (!value) {
      toast("Scheduled reminders turned off", "info");
      return;
    }
    setBusy(true);
    try {
      const result = await syncScheduledReminders({ force: true });
      toast(
        result.supported
          ? result.scheduled > 0
            ? `${result.scheduled} reminder${result.scheduled === 1 ? "" : "s"} scheduled`
            : "Reminders refreshed"
          : "Scheduled reminders need the installed Android app",
        result.supported ? "success" : "info"
      );
    } finally {
      setBusy(false);
    }
  }

  function openSettings() {
    if (openDeviceNotificationSettings()) return;
    toast("Open Settings → Apps → Group Portal → Notifications.", "info");
  }

  if (!mounted) {
    return (
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <BellIcon width={18} height={18} className="text-brand" />
          Phone notifications
        </h2>
        <p className="text-sm text-muted">Checking this device…</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <BellIcon width={18} height={18} className="text-brand" />
        Phone notifications
        {available && permission !== "denied" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckIcon width={11} height={11} /> Ready
          </span>
        ) : null}
      </h2>
      <p className="mb-3 text-sm text-muted">
        Alerts on this phone, including the installed Android app. Activity
        alerts appear while the app polls for new events; due-date and exam
        reminders are scheduled on the device itself.
      </p>

      {!available ? (
        <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-surface2/60 px-3 py-2 text-xs text-muted">
          <InfoIcon width={14} height={14} className="mt-0.5 shrink-0" />
          <span>
            This browser cannot show notifications. Install the Android app
            built from this site — and tick Notifications and Reminders in the
            APK builder — or use a browser that supports notifications.
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void enable()}
          disabled={busy || !available || permission === "granted"}
          className="min-h-11"
        >
          {permission === "granted" ? "Permission granted" : busy ? "Working…" : "Allow notifications"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void sendTest()}
          disabled={busy || !available || permission === "denied"}
          className="min-h-11"
        >
          Send test
        </Button>
      </div>

      {permission === "denied" ? (
        <div className="mt-2">
          <p className="text-xs text-rose-600 dark:text-rose-300">
            Notifications are blocked for this app. Allow them in your phone
            settings, then reload the app.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={openSettings}
            className="mt-2 min-h-11 text-xs"
          >
            Open notification settings
          </Button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col divide-y divide-border border-t border-border">
        <label className="flex cursor-pointer items-start justify-between gap-3 py-3">
          <span className="text-sm">
            Activity alerts
            <span className="block text-xs text-muted">
              New mentions, comments, assignments, and reminders.
            </span>
          </span>
          <input
            type="checkbox"
            checked={activity}
            disabled={!available}
            onChange={(event) => void toggleActivity(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border disabled:opacity-40"
          />
        </label>

        <label className="flex cursor-pointer items-start justify-between gap-3 py-3">
          <span className="text-sm">
            Due-date and exam reminders
            <span className="block text-xs text-muted">
              {reminders
                ? "Scheduled on this device when you open the app."
                : "Requires the installed Android app."}
            </span>
          </span>
          <input
            type="checkbox"
            checked={reminderSync}
            disabled={!available || !reminders}
            onChange={(event) => void toggleReminders(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border disabled:opacity-40"
          />
        </label>
      </div>

      {reminders ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void toggleReminders(true)}
          disabled={busy || !reminderSync}
          className="mt-3 min-h-11 text-xs"
        >
          {busy ? "Refreshing…" : "Refresh scheduled reminders"}
        </Button>
      ) : null}
    </Card>
  );
}
