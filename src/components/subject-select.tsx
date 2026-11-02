"use client";

import { Select } from "./ui";
import type { SubjectOption } from "@/lib/subject-options";

/**
 * Subject picker shared by the library, deadline, study and timetable forms.
 * Submitting an id (instead of free text) means a typo can no longer create an
 * unlinked row, and archived subjects are labelled instead of hidden.
 */
export function SubjectSelect({
  subjects,
  placeholder = "Choose a subject",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  subjects: SubjectOption[];
  placeholder?: string;
}) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {subjects.map((subject) => (
        <option key={subject.id} value={subject.id}>
          {subject.name}
          {subject.archivedAt ? " (archived)" : ""}
        </option>
      ))}
    </Select>
  );
}
