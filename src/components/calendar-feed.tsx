"use client";

import { useState } from "react";
import { Button, Card, Input } from "./ui";
import { useToast } from "./toast";
import { CalendarIcon, CheckIcon } from "./icons";

export function CalendarFeed({ url }: { url: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Calendar link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy the link. Select it and copy manually.", "error");
    }
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <CalendarIcon width={18} height={18} className="text-brand" />
        Calendar feed
      </h2>
      <p className="mb-3 text-sm text-muted">
        Subscribe once to see group exams, your task deadlines, and the shared timetable in
        Google Calendar, Apple Calendar, or Outlook.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={url}
          aria-label="Calendar feed URL"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 text-xs"
        />
        <Button type="button" onClick={copy} className="shrink-0">
          {copied ? <CheckIcon width={15} height={15} /> : <CalendarIcon width={15} height={15} />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Treat this link like a password. It is read-only, and changing your password revokes it.
        In Google Calendar, use Other calendars &gt; From URL.
      </p>
    </Card>
  );
}
