"use client";

import Link from "next/link";
import { Card } from "./ui";
import { NotesIcon, PlusIcon } from "./icons";

/**
 * A compact shelf of the most recent shared notes shown on the Study tab, so
 * material is reachable while logging sessions without leaving the page.
 */
export function StudyNotesPanel({
  meId,
  notes,
}: {
  meId: string;
  notes: {
    id: string;
    title: string;
    subject: string;
    authorName: string;
    authorId: string;
  }[];
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <NotesIcon width={18} height={18} className="text-brand" />
          Notes
        </h2>
        <Link
          href="/notes"
          className="text-xs font-medium text-brand hover:underline"
        >
          Open notes
        </Link>
      </div>

      {notes.length === 0 ? (
        <Link
          href="/notes"
          className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
        >
          <PlusIcon width={16} height={16} />
          Add the first study note
        </Link>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {notes.map((n) => (
            <li key={n.id}>
              <Link
                href="/notes"
                className="flex flex-col gap-0.5 py-2 transition-colors hover:text-brand"
              >
                <span className="truncate text-sm font-medium">{n.title}</span>
                <span className="truncate text-xs text-muted">
                  {n.subject} · {n.authorId === meId ? "You" : n.authorName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/notes"
        className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
      >
        <PlusIcon width={16} height={16} />
        Add a note while studying
      </Link>
    </Card>
  );
}
