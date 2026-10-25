"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logStudy } from "@/lib/actions/study";
import { Button, Card, Input, Select } from "./ui";
import { TimerIcon, CheckIcon } from "./icons";
import { useToast } from "./toast";

type Phase = "idle" | "focus" | "break";

type TimerTask = {
  id: string;
  title: string;
  projectName: string;
};

const PRESETS = [
  { label: "25 / 5", focus: 25, rest: 5 },
  { label: "50 / 10", focus: 50, rest: 10 },
  { label: "15 / 3", focus: 15, rest: 3 },
];

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * A Pomodoro timer that logs a study session automatically when a focus block
 * finishes. Members can link the block to an active task and log the elapsed
 * minutes early instead of losing a partially completed session.
 */
export function FocusTimer({
  subject,
  tasks = [],
  autoStart = false,
}: {
  subject?: string;
  tasks?: TimerTask[];
  autoStart?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [presetIndex, setPresetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(autoStart ? "focus" : "idle");
  const [remaining, setRemaining] = useState(PRESETS[0].focus * 60);
  const [topic, setTopic] = useState(subject ?? "");
  const [taskId, setTaskId] = useState("");

  // Refs mirror the values a running interval needs. Synced in an effect so we
  // never touch refs during render.
  const phaseRef = useRef<Phase>(phase);
  const presetRef = useRef(PRESETS[presetIndex]);
  const topicRef = useRef(topic);
  const taskIdRef = useRef(taskId);
  const remainingRef = useRef(PRESETS[0].focus * 60);
  useEffect(() => {
    phaseRef.current = phase;
    presetRef.current = PRESETS[presetIndex];
    topicRef.current = topic;
    taskIdRef.current = taskId;
  }, [phase, presetIndex, topic, taskId]);

  // Keep the latest save routine in a ref so the one-second interval does not
  // need to be torn down on every render.
  const saveFocusRef = useRef<(minutes: number) => void>(() => {});
  useEffect(() => {
    saveFocusRef.current = (minutes: number) => {
      const fd = new FormData();
      fd.set("subject", topicRef.current.trim() || "Focus session");
      fd.set("minutes", String(minutes));
      if (taskIdRef.current) fd.set("taskId", taskIdRef.current);
      void (async () => {
        try {
          let res = await logStudy(fd);
          // The linked task may have been completed or deleted while the timer
          // was running. Keep the study time and retry without the link.
          if (!res.ok && fd.get("taskId")) {
            fd.delete("taskId");
            res = await logStudy(fd);
          }
          if (res.ok) {
            toast(`Logged ${minutes} min of focus`, "success");
            router.refresh();
          } else {
            toast(res.error, "error");
          }
        } catch {
          toast("Could not log the session automatically.", "error");
        }
      })();
    };
  }, [router, toast]);

  const updateRemaining = useCallback((seconds: number) => {
    remainingRef.current = seconds;
    setRemaining(seconds);
  }, []);
  // Count down once per second while a phase is running.
  useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => {
      const next = remainingRef.current - 1;
      if (next > 0) {
        updateRemaining(next);
        return;
      }

      const preset = presetRef.current;
      if (phaseRef.current === "focus") {
        saveFocusRef.current(preset.focus);
        phaseRef.current = "break";
        setPhase("break");
        updateRemaining(preset.rest * 60);
        return;
      }

      phaseRef.current = "idle";
      setPhase("idle");
      updateRemaining(preset.focus * 60);
      toast("Break over", "success");
    }, 1000);
    return () => clearInterval(id);
  }, [phase, toast, updateRemaining]);

  function start() {
    updateRemaining(PRESETS[presetIndex].focus * 60);
    setPhase("focus");
  }

  function stop() {
    setPhase("idle");
    updateRemaining(PRESETS[presetIndex].focus * 60);
  }

  function pickPreset(i: number) {
    setPresetIndex(i);
    setPhase("idle");
    updateRemaining(PRESETS[i].focus * 60);
  }

  const preset = PRESETS[presetIndex];
  const elapsedSeconds = phase === "focus" ? preset.focus * 60 - remaining : 0;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const pct =
    phase === "focus"
      ? (1 - remaining / (preset.focus * 60)) * 100
      : phase === "break"
        ? (1 - remaining / (preset.rest * 60)) * 100
        : 0;

  function logEarly() {
    if (elapsedMinutes < 1) {
      toast("Focus for at least a minute before logging.", "info");
      return;
    }
    saveFocusRef.current(elapsedMinutes);
    stop();
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <TimerIcon width={18} height={18} className="text-brand" />
        Focus timer
      </h2>

      <div className="flex items-center gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            onClick={() => pickPreset(i)}
            disabled={phase !== "idle"}
            aria-pressed={i === presetIndex}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              i === presetIndex ? "bg-brand text-white" : "bg-surface2 text-muted hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 py-2">
        <span
          className={`text-4xl font-bold tabular-nums ${
            phase === "break" ? "text-emerald-600 dark:text-emerald-400" : ""
          }`}
        >
          {mmss(remaining)}
        </span>
        <span className="text-xs uppercase tracking-wide text-muted">
          {phase === "idle" ? "ready" : phase === "focus" ? "focus" : "break"}
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className={`h-full rounded-full ${phase === "break" ? "bg-emerald-500" : "bg-brand"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={80}
          placeholder="e.g. React"
          disabled={phase !== "idle"}
        />
      </label>

      {tasks.length > 0 ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Task (optional)
          </span>
          <Select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={phase !== "idle"}
            className="w-full"
          >
            <option value="">No task link</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} · {t.projectName}
              </option>
            ))}
          </Select>
        </label>
      ) : (
        <p className="text-xs text-muted">
          Assign yourself a task on the Tasks page to link focus time to it.
        </p>
      )}

      {phase === "idle" ? (
        <Button type="button" onClick={start}>
          <TimerIcon width={15} height={15} />
          Start focus
        </Button>
      ) : phase === "focus" ? (
        <div className="flex flex-col gap-2">
          <Button type="button" onClick={logEarly} disabled={elapsedMinutes < 1}>
            <CheckIcon width={15} height={15} />
            Log {elapsedMinutes > 0 ? `${elapsedMinutes} min` : "elapsed"} &amp; end
          </Button>
          <Button type="button" variant="outline" onClick={stop}>
            End without logging
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={stop}>
          <CheckIcon width={15} height={15} />
          Skip break
        </Button>
      )}
      <p className="text-xs text-muted">
        A finished focus block is logged automatically. Use Log elapsed &amp; end
        to keep the minutes you have already focused.
      </p>
    </Card>
  );
}
