import test from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, icsEscape } from "./calendar";

test("icsEscape escapes separators and newlines", () => {
  assert.equal(icsEscape("Math; Limits, Part 1"), "Math\\; Limits\\, Part 1");
  assert.equal(icsEscape("a\\b"), "a\\\\b");
  assert.equal(icsEscape("line one\nline two"), "line one\\nline two");
});

test("buildCalendar emits all-day events and recurring classes", () => {
  const ics = buildCalendar({
    today: "2026-10-25",
    now: new Date("2026-10-25T10:00:00Z"),
    exams: [
      {
        id: "e1",
        title: "Midterm; Part 1",
        subject: "Calculus",
        kind: "exam",
        date: "2026-11-02",
        notes: "Room 4\nBring ID",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Finish problem set",
        dueDate: "2026-10-30",
        projectName: "Calculus",
      },
    ],
    classes: [
      {
        id: "c1",
        title: "Calculus lecture",
        weekday: 1,
        startMin: 540,
        endMin: 630,
        location: "Room 4",
      },
    ],
  });

  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /PRODID:-\/\/Group Portal\/\/Study Calendar\/\/EN/);
  assert.match(ics, /UID:exam-e1@group-portal/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261102/);
  assert.match(ics, /DTEND;VALUE=DATE:20261103/);
  assert.match(ics, /SUMMARY:Exam: Midterm\\; Part 1/);
  assert.match(ics, /DESCRIPTION:Calculus\\nRoom 4\\nBring ID/);
  assert.match(ics, /UID:task-t1@group-portal/);
  assert.match(ics, /SUMMARY:Task due: Finish problem set/);
  assert.match(ics, /UID:class-c1@group-portal/);
  assert.match(ics, /DTSTART:20261026T090000/);
  assert.match(ics, /DTEND:20261026T103000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;COUNT=16/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
});

test("buildCalendar rolls a class ending at midnight into the next day", () => {
  const ics = buildCalendar({
    today: "2026-10-25",
    exams: [],
    tasks: [],
    classes: [
      {
        id: "c2",
        title: "Late lab",
        weekday: 1,
        startMin: 1430,
        endMin: 1440,
      },
    ],
  });
  assert.match(ics, /DTSTART:20261026T235000/);
  assert.match(ics, /DTEND:20261027T000000/);
});
