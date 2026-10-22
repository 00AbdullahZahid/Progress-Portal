"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logStudy } from "@/lib/actions/study";
import { Button, Card, Input } from "./ui";
import { TimerIcon, CheckIcon } from "./icons";
import { useToast } from "./toast";

type Phase = "idle" | "focus" | "break";

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
 * finishes, so the study log stays accurate without manual minute entry.
 */
export function FocusTimer({ subject }: { subject?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [presetIndex, setPresetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(PRESETS[0].focus * 60);
  const [topic, setTopic] = useState(subject ?? "");

  // Refs mirror the state a running interval needs. Synced in an effect so we
  // never touch refs during render.
  const phaseRef = useRef<Phase>(phase);
  const presetRef = useRef(PRESETS[presetIndex]);
  const topicRef = useRef(topic);
  useEffect(() => {
    phaseRef.current = phase;
    presetRef.current = PRESETS[presetIndex];
    topicRef.current = topic;
  }, [phase, presetIndex, topic]);

  // Count down once per second while a phase is running.
  useEffect(() => {
    if (phase === "idle") return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        // Reached zero: advance the phase and (for focus) log the session.
        const preset = presetRef.current;
        if (phaseRef.current === "focus") {
          const minutes = preset.focus;
          void (async () => {
            const fd = new FormData();
            fd.set("subject", topicRef.current.trim() || "Focus session");
            fd.set("minutes", String(minutes));
            try {
              const res = await logStudy(fd);
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
          setPhase("break");
          return preset.rest * 60;
        }
        setPhase("idle");
        toast("Break over", "success");
        return preset.focus * 60;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, router, toast]);

  function start() {
    setRemaining(PRESETS[presetIndex].focus * 60);
    setPhase("focus");
  }

  function stop() {
    setPhase("idle");
    setRemaining(PRESETS[presetIndex].focus * 60);
  }

  function pickPreset(i: number) {
    setPresetIndex(i);
    setPhase("idle");
    setRemaining(PRESETS[i].focus * 60);
  }

  const preset = PRESETS[presetIndex];
  const pct =
    phase === "focus"
      ? (1 - remaining / (preset.focus * 60)) * 100
      : phase === "break"
        ? (1 - remaining / (preset.rest * 60)) * 100
        : 0;

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
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
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
        <span className="mb-1 block text-xs font-medium text-muted">
          Subject (logged on completion)
        </span>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={80}
          placeholder="e.g. React"
          disabled={phase !== "idle"}
        />
      </label>

      {phase === "idle" ? (
        <Button type="button" onClick={start}>
          <TimerIcon width={15} height={15} />
          Start focus
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={stop}>
          <CheckIcon width={15} height={15} />
          {phase === "break" ? "Skip break" : "Stop"}
        </Button>
      )}
      <p className="text-xs text-muted">
        A finished focus block is logged automatically with the minutes above.
      </p>
    </Card>
  );
}
