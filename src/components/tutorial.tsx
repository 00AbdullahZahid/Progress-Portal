"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui";
import { XIcon, InfoIcon } from "./icons";

const ENABLED_KEY = "tutorial-enabled";
const SEEN_KEY = "tutorial-seen";
const OPEN_EVENT = "tutorial-open";

/** True unless the member turned the tour off in settings. */
function isTutorialEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * Open the tour from anywhere. Clears the "seen" flag so it starts at step one
 * even on a browser that has already finished it.
 */
export function startTutorial() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, "0");
  } catch {
    // Ignore — the event below still opens it for this visit.
  }
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Step = {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to the Group Portal",
    body: "This is the shared workspace for your study group: tasks, habits, study time, notes, deadlines, resources, a timetable, and chat all live here. The top bar holds search, refresh, your profile menu, and the bell that collects updates for you. This short tour shows what each area is for; you can skip it and replay it any time from Settings or the feature guide.",
  },
  {
    title: "Dashboard",
    body: "Your starting point. A greeting and the Up next strip show your next class, nearest deadline, and assigned tasks; context-rich stat cards link to the matching page. Quick actions open the focus timer, study logger, doubts, and habits. Charts switch between Me and Group over 7, 14, or 30 days, and the dashboard also shows your streak, weekly goal ring, and latest chat.",
    href: "/dashboard",
    linkLabel: "Open dashboard",
  },
  {
    title: "Tasks and habits",
    body: "Tasks are organised by project and goal, and a separate New task panel lets you add one to any project or as a standalone task with no project. Assign each task to one or more people, give it a status, priority, and due date, then comment as work moves along. Habits are personal: create a daily habit and check in with one tap to build a streak.",
    href: "/tasks",
    linkLabel: "Open tasks",
  },
  {
    title: "Study log and notes",
    body: "Log a study session with subject, minutes, and date, and the page tracks your weekly goal. Notes are shared by subject: everyone can read them, while only the author or an admin can edit or delete a note. Both support optional attachments.",
    href: "/study",
    linkLabel: "Open study log",
  },
  {
    title: "Deadlines, flashcards, and doubts",
    body: "Deadlines is a shared countdown of exams and assignments. Flashcards use spaced repetition: cards you get right come back later, cards you miss come back sooner. Doubts is a subject-based question board where one answer can be marked as accepted.",
    href: "/exams",
    linkLabel: "Open deadlines",
  },
  {
    title: "Resources and timetable",
    body: "Resources is the shared library of papers, books, videos, and links. Search it, filter by type or subject, sort it, or switch to just your additions. You can pin, mark useful, and mark items read; subject groups collapse to keep the page short. The add form can fetch a link's title and icon and warns about duplicates. The timetable is the group's weekly class calendar on a real time grid: everyone can view it, but only admins can add or remove classes.",
    href: "/resources",
    linkLabel: "Open resources",
  },
  {
    title: "Grades, search, and chat",
    body: "Grades is private to you: courses, weights, marks, and a GPA prediction. Search finds notes, tasks, resources, and chat messages in one place. Chat has group channels and refreshes automatically.",
    href: "/grades",
    linkLabel: "Open grades",
  },
  {
    title: "Settings and the guide",
    body: "Settings opens with Appearance, where you choose Light, Dark, or System and one of eight accent colours; both save to this device instantly. Below that you can change your name, profile colour, photo, timezone, password, and weekly goal. Turn individual notification events on or off, and enable browser push on each device for alerts even when the portal is closed. On iPhone and iPad, add the portal to your Home Screen first. The feature guide explains every page and permission; replay this tour from either place whenever you like.",
    href: "/guide",
    linkLabel: "Open feature guide",
  },
];

/**
 * The guided tour. Mounted once in the app shell so it can appear on any page,
 * and reopened by the `tutorial-open` event from Settings or the guide page.
 */
export function Tutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Defer to the next frame so we never set state during the effect body.
    const raf = requestAnimationFrame(() => {
      let seen = false;
      try {
        seen = localStorage.getItem(SEEN_KEY) === "1";
      } catch {
        // Storage blocked: show the tour once per page load.
      }
      if (!seen && isTutorialEnabled()) setOpen(true);
    });

    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function remember() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Ignore.
    }
  }

  function close() {
    remember();
    setOpen(false);
  }

  function finish() {
    remember();
    setStep(0);
    setOpen(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function hideForever() {
    try {
      localStorage.setItem(ENABLED_KEY, "0");
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Ignore.
    }
    setStep(0);
    setOpen(false);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-xl sm:max-h-[calc(100dvh-3rem)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
            <InfoIcon width={14} height={14} className="text-brand" />
            Step {step + 1} of {STEPS.length}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close tutorial"
            className="-mr-1 -mt-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-ink"
          >
            <XIcon width={16} height={16} />
          </button>
        </div>

        <h2 id="tutorial-title" className="mt-2 text-lg font-semibold">
          {current.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{current.body}</p>

        {current.href ? (
          <Link
            href={current.href}
            onClick={close}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline"
          >
            {current.linkLabel ?? "Open page"}
          </Link>
        ) : null}

        <div className="mt-4 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-brand" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1.5 text-sm"
              disabled={step === 0}
              onClick={back}
            >
              Back
            </Button>
            <Button type="button" className="px-3 py-1.5 text-sm" onClick={isLast ? finish : next}>
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
          <button
            type="button"
            onClick={hideForever}
            className="inline-flex min-h-11 items-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Don&apos;t show this again
          </button>
        </div>

        {isLast ? null : (
          <button
            type="button"
            onClick={close}
            className="mt-2 inline-flex min-h-11 items-center text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Skip the tour
          </button>
        )}
      </div>
    </div>
  );
}

/** Button used on the feature guide to replay the tour. */
export function TutorialStartButton({
  label = "Start tutorial",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "outline";
}) {
  return (
    <Button type="button" variant={variant} onClick={startTutorial}>
      {label}
    </Button>
  );
}

/** Settings control: turn the automatic tour on or off, or replay it now. */
export function TutorialPreference() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEnabled(isTutorialEnabled()));
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem(ENABLED_KEY, next ? "1" : "0");
    } catch {
      // Ignore — the tour still works for this visit.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Show the welcome tour</p>
          <p className="mt-0.5 text-xs text-muted">
            The short guided tour appears once per browser. Turning this off stops it from
            opening on its own; you can still replay it any time.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Show the welcome tour"
          onClick={toggle}
          className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-brand" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <TutorialStartButton variant="outline" label="Replay tutorial" />
        <Link
          href="/guide"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface2"
        >
          Read the feature guide
        </Link>
      </div>
    </div>
  );
}
