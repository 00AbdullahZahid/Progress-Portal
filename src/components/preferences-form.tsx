"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setWeeklyGoal } from "@/lib/actions/goals";
import { setNotificationPrefs } from "@/lib/actions/notifications";
import { exportMyData } from "@/lib/actions/export";
import { Button, Card, Input } from "./ui";
import { useToast } from "./toast";
import { TimerIcon, BellIcon, DownloadIcon } from "./icons";

export function PreferencesForm({
  weeklyGoalMinutes,
  notifyTasks,
  notifyExams,
}: {
  weeklyGoalMinutes: number;
  notifyTasks: boolean;
  notifyExams: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [hours, setHours] = useState(
    weeklyGoalMinutes > 0 ? String(weeklyGoalMinutes / 60) : ""
  );
  const [prefs, setPrefs] = useState({ tasks: notifyTasks, exams: notifyExams });
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function saveGoal() {
    const fd = new FormData();
    fd.set("weeklyGoalHours", hours || "0");
    setBusy(true);
    try {
      const res = await setWeeklyGoal(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Weekly goal saved", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(next: { tasks: boolean; exams: boolean }) {
    setPrefs(next);
    const fd = new FormData();
    if (next.tasks) fd.set("notifyTasks", "on");
    if (next.exams) fd.set("notifyExams", "on");
    await setNotificationPrefs(fd);
    router.refresh();
  }

  async function download() {
    setExporting(true);
    try {
      const res = await exportMyData();
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `group-portal-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded", "success");
    } catch {
      toast("Could not build the export. Please try again.", "error");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <TimerIcon width={18} height={18} className="text-brand" />
        Goals & notifications
      </h2>
      <p className="mb-3 text-sm text-muted">
        Set a weekly study target and choose what the daily digest includes.
      </p>

      <label className="mb-3 block max-w-xs">
        <span className="mb-1 block text-xs font-medium text-muted">
          Weekly study goal (hours)
        </span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={168}
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 10"
          />
          <Button type="button" onClick={saveGoal} disabled={busy} className="shrink-0">
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </label>

      <div className="mb-3 flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.tasks}
            onChange={(e) => toggle({ ...prefs, tasks: e.target.checked })}
            className="rounded border-border"
          />
          Include upcoming tasks in the digest
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={prefs.exams}
            onChange={(e) => toggle({ ...prefs, exams: e.target.checked })}
            className="rounded border-border"
          />
          Include upcoming exams and deadlines
        </label>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <BellIcon width={16} height={16} className="text-muted" />
        <p className="flex-1 text-xs text-muted">
          The digest is sent once a day to the group webhook, when configured.
        </p>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <DownloadIcon width={16} height={16} className="text-brand" />
          Export your data
        </h3>
        <p className="mb-2 text-xs text-muted">
          Download your study sessions, habits, tasks, notes and grades as JSON.
        </p>
        <Button type="button" variant="outline" onClick={download} disabled={exporting}>
          <DownloadIcon width={15} height={15} />
          {exporting ? "Building…" : "Download JSON"}
        </Button>
      </div>
    </Card>
  );
}
