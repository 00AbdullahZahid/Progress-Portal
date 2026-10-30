import { shiftDate } from "./dates";

type CalendarExam = {
  id: string;
  title: string;
  subject: string;
  kind: string;
  date: string;
  notes?: string | null;
};

type CalendarTask = {
  id: string;
  title: string;
  dueDate: string;
  projectName?: string;
};

type CalendarClass = {
  id: string;
  title: string;
  weekday: number;
  startMin: number;
  endMin: number;
  location?: string | null;
};

type CalendarInput = {
  today: string;
  exams: CalendarExam[];
  tasks: CalendarTask[];
  classes: CalendarClass[];
  now?: Date;
};

const KIND_LABELS: Record<string, string> = {
  exam: "Exam",
  assignment: "Assignment",
  quiz: "Quiz",
  deadline: "Deadline",
};

/** Escape a text value for an ICS property. */
export function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Fold long ICS lines at 75 octets, as required by RFC 5545. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  for (const char of line) {
    if (encoder.encode(current + char).length > 74) {
      chunks.push(current);
      current = ` ${char}`;
    } else {
      current += char;
    }
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n");
}

function compactDate(date: string): string {
  return date.replace(/-/g, "");
}

function addOneDay(date: string): string {
  return shiftDate(date, 1);
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}

function weekdayOf(date: string): number {
  return new Date(date + "T12:00:00Z").getUTCDay();
}

/** The next calendar date on or after `today` that falls on `weekday`. */
function nextWeekday(today: string, weekday: number): string {
  return shiftDate(today, (weekday - weekdayOf(today) + 7) % 7);
}

function eventLines(lines: string[]): string[] {
  return lines.map(foldLine);
}

/**
 * Build a read-only calendar with:
 * - group exams, assignments, quizzes, and deadlines (all-day events)
 * - the member's own open task deadlines (all-day events)
 * - the shared weekly timetable, repeated for 16 weeks
 */
export function buildCalendar({
  today,
  exams,
  tasks,
  classes,
  now = new Date(),
}: CalendarInput): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Group Portal//Study Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Group Portal",
    "X-WR-TIMEZONE:Asia/Karachi",
  ];

  const stamp = utcStamp(now);

  for (const exam of exams) {
    const label = KIND_LABELS[exam.kind] ?? "Exam";
    const description = [exam.subject, exam.notes].filter(Boolean).join("\n");
    lines.push(
      ...eventLines([
        "BEGIN:VEVENT",
        `UID:exam-${exam.id}@group-portal`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactDate(exam.date)}`,
        `DTEND;VALUE=DATE:${compactDate(addOneDay(exam.date))}`,
        `SUMMARY:${icsEscape(`${label}: ${exam.title}`)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        `CATEGORIES:${icsEscape(exam.subject)}`,
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ])
    );
  }

  for (const task of tasks) {
    const description = task.projectName
      ? `Project: ${task.projectName}`
      : "Assigned task";
    lines.push(
      ...eventLines([
        "BEGIN:VEVENT",
        `UID:task-${task.id}@group-portal`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactDate(task.dueDate)}`,
        `DTEND;VALUE=DATE:${compactDate(addOneDay(task.dueDate))}`,
        `SUMMARY:${icsEscape(`Task due: ${task.title}`)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ])
    );
  }

  for (const cls of classes) {
    if (cls.weekday < 0 || cls.weekday > 6) continue;
    const start = Math.max(0, Math.min(1439, cls.startMin));
    const end = Math.max(start + 1, Math.min(1440, cls.endMin));
    const date = nextWeekday(today, cls.weekday);
    // A class ending at midnight rolls into the next calendar day.
    const endDate = end === 1440 ? addOneDay(date) : date;
    lines.push(
      ...eventLines([
        "BEGIN:VEVENT",
        `UID:class-${cls.id}@group-portal`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${compactDate(date)}T${clock(start)}`,
        `DTEND:${compactDate(endDate)}T${clock(end % 1440)}`,
        "RRULE:FREQ=WEEKLY;COUNT=16",
        `SUMMARY:${icsEscape(cls.title)}`,
        `LOCATION:${icsEscape(cls.location ?? "")}`,
        "DESCRIPTION:Weekly class",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT",
      ])
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
