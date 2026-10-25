"use client";

import { useEffect, useState } from "react";
import {
  setNotificationEventPrefs,
  setPushPreference,
} from "@/lib/actions/notifications";
import { Button, Card } from "./ui";
import { useToast } from "./toast";
import { BellIcon, CheckIcon, InfoIcon } from "./icons";

const EVENT_OPTIONS = [
  {
    key: "notifyTaskAssigned",
    label: "Task assigned to me",
    hint: "When someone puts your name on a task.",
  },
  {
    key: "notifyTaskComments",
    label: "Comments and mentions",
    hint: "New comments on your tasks, plus @mentions.",
  },
  {
    key: "notifyTaskStatus",
    label: "Task status changes",
    hint: "When an assigned task moves between todo, doing, and done.",
  },
  {
    key: "notifyTaskDue",
    label: "Due today and overdue",
    hint: "A daily nudge for tasks that need attention.",
  },
  {
    key: "notifyNewProjects",
    label: "New projects",
    hint: "When an admin creates a project.",
  },
] as const;

type EventKey = (typeof EVENT_OPTIONS)[number]["key"];

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationSettings({
  initial,
  pushPublicKey,
}: {
  initial: Record<EventKey, boolean> & { notifyPush: boolean };
  pushPublicKey: string;
}) {
  const { toast } = useToast();
  const [events, setEvents] = useState(initial);
  const [pushEnabled, setPushEnabled] = useState(initial.notifyPush);
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (
        typeof navigator === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) {
          setSupported(false);
          setChecking(false);
        }
        return;
      }

      try {
        setPermission(Notification.permission);
        const registration =
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(subscription));
      } catch {
        if (!cancelled) setSupported(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleEvent(key: EventKey, value: boolean) {
    const next = { ...events, [key]: value };
    setEvents(next);
    const fd = new FormData();
    for (const option of EVENT_OPTIONS) {
      if (next[option.key]) fd.set(option.key, "on");
    }
    const res = await setNotificationEventPrefs(fd);
    if (!res.ok) {
      setEvents(events);
      toast(res.error, "error");
    }
  }

  async function savePushPreference(enabled: boolean) {
    setPushEnabled(enabled);
    const fd = new FormData();
    if (enabled) fd.set("enabled", "on");
    const res = await setPushPreference(fd);
    if (!res.ok) {
      setPushEnabled(!enabled);
      toast(res.error, "error");
    }
  }

  async function enablePush() {
    if (!pushPublicKey) {
      toast("Push notifications are not configured on this deployment.", "error");
      return;
    }

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        toast("Browser permission was not granted.", "error");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushPublicKey) as BufferSource,
        }));

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        toast("Could not save this device for push notifications.", "error");
        return;
      }

      setSubscribed(true);
      await savePushPreference(true);
      toast("Browser push enabled on this device", "success");
    } catch {
      toast("Could not enable browser push. Check your browser settings.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      await savePushPreference(false);
      toast("Browser push disabled on this device", "success");
    } catch {
      toast("Could not disable browser push.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="scroll-mt-24">
      <div id="notifications" className="scroll-mt-24">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <BellIcon width={18} height={18} className="text-brand" />
          Notifications
        </h2>
        <p className="mb-4 text-sm text-muted">
          Choose what lands in your bell. Changes save automatically.
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EVENT_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface2/40 p-3 transition-colors hover:bg-surface2"
            >
              <input
                type="checkbox"
                checked={events[option.key]}
                onChange={(event) => void toggleEvent(option.key, event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                Browser push
                {subscribed ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckIcon width={11} height={11} /> On this device
                  </span>
                ) : null}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Get a notification on this phone or computer, even when the portal
                is closed. Push follows the event choices above.
              </p>
            </div>
            {!supported ? null : subscribed ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void disablePush()}
                disabled={busy}
                className="min-h-11 shrink-0"
              >
                {busy ? "Working…" : "Turn off"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void enablePush()}
                disabled={
                  busy || checking || permission === "denied" || !pushPublicKey
                }
                className="min-h-11 shrink-0"
              >
                {busy ? "Enabling…" : "Enable"}
              </Button>
            )}
          </div>

          {!pushPublicKey ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <InfoIcon width={14} height={14} className="mt-0.5 shrink-0" />
              Push is not configured on this deployment yet. Add VAPID keys to
              enable it.
            </p>
          ) : null}
          {supported && permission === "denied" ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              Browser notifications are blocked for this site. Allow them in your
              browser settings, then reload this page.
            </p>
          ) : null}
          {!supported ? (
            <p className="mt-2 text-xs text-muted">
              This browser does not support push notifications.
            </p>
          ) : null}
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted">
            <InfoIcon width={13} height={13} className="mt-0.5 shrink-0" />
            <span>
              On iPhone and iPad, add the portal to your Home Screen first. Safari
              only allows web push for installed apps.
            </span>
          </p>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-border pt-3">
            <span className="text-sm">
              Send push notifications
              <span className="block text-xs text-muted">
                You can keep the bell on while muting pushes.
              </span>
            </span>
            <input
              type="checkbox"
              checked={pushEnabled}
              disabled={!subscribed || busy}
              onChange={(event) => void savePushPreference(event.target.checked)}
              className="h-4 w-4 rounded border-border disabled:opacity-40"
            />
          </label>
        </div>
      </div>
    </Card>
  );
}
