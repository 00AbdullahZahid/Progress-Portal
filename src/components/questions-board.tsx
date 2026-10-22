"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptAnswer,
  createAnswer,
  createQuestion,
  deleteQuestion,
} from "@/lib/actions/questions";
import { Avatar } from "./avatar";
import { Button, Card, Input, Textarea, Select, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { QuestionIcon, PlusIcon, XIcon, CheckIcon } from "./icons";

export type AnswerRow = {
  id: string;
  body: string;
  accepted: boolean;
  authorId: string;
  author: { id: string; name: string; color: string; image?: string | null };
};

export type QuestionRow = {
  id: string;
  subject: string;
  title: string;
  body: string;
  authorId: string;
  author: { id: string; name: string; color: string; image?: string | null };
  answers: AnswerRow[];
};

export function QuestionsBoard({
  questions,
  meId,
  isAdmin,
  subjects,
}: {
  questions: QuestionRow[];
  meId: string;
  isAdmin: boolean;
  subjects: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<QuestionRow | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function submit(fd: FormData) {
    setBusy(true);
    try {
      const res = await createQuestion(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Question posted", "success");
      setCreating(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function answer(questionId: string, fd: FormData) {
    fd.set("questionId", questionId);
    setBusy(true);
    try {
      const res = await createAnswer(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Answer posted", "success");
      setReplyTo(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function accept(answerId: string) {
    const fd = new FormData();
    fd.set("answerId", answerId);
    const res = await acceptAnswer(fd);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    router.refresh();
  }

  async function confirmDelete() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const fd = new FormData();
    fd.set("questionId", id);
    try {
      const res = await deleteQuestion(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Question removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  const shown = filter ? questions.filter((q) => q.subject === filter) : questions;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by subject"
          className="w-auto"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          className="ml-auto"
          onClick={() => setCreating((c) => !c)}
        >
          <PlusIcon width={16} height={16} />
          Ask a question
        </Button>
      </Card>

      {creating ? (
        <Card className="p-4">
          <form action={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
                <Input name="subject" maxLength={60} required list="q-subjects" placeholder="e.g. Calculus" />
                <datalist id="q-subjects">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                <Input name="title" maxLength={160} required placeholder="Keep it short and specific" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Details</span>
              <Textarea name="body" rows={4} maxLength={5000} required />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="px-3 py-1.5 text-sm">
                <PlusIcon width={15} height={15} />
                {busy ? "Posting…" : "Post question"}
              </Button>
              <Button type="button" variant="outline" className="px-3 py-1.5 text-sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon={<QuestionIcon />}
          title="No questions yet"
          hint="Ask a question and the group can answer it, with one answer marked accepted."
        />
      ) : (
        shown.map((q) => {
          const canDelete = q.authorId === meId || isAdmin;
          return (
            <Card key={q.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="w-fit rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">
                    {q.subject}
                  </span>
                  <h3 className="mt-1 font-semibold">{q.title}</h3>
                </div>
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setPending(q)}
                    title="Delete question"
                    aria-label="Delete question"
                    className="text-muted transition-colors hover:text-rose-600"
                  >
                    <XIcon width={15} height={15} />
                  </button>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-muted">{q.body}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Avatar user={q.author} size="sm" />
                {q.authorId === meId ? "You" : q.author.name}
              </div>

              {q.answers.length > 0 ? (
                <ul className="flex flex-col gap-2 border-t border-border pt-3">
                  {q.answers.map((a) => (
                    <li
                      key={a.id}
                      className={`flex items-start gap-2 rounded-xl px-3 py-2 ${
                        a.accepted ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-surface2"
                      }`}
                    >
                      <Avatar user={a.author} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm">{a.body}</p>
                        <p className="text-xs text-muted">
                          {a.authorId === meId ? "You" : a.author.name}
                        </p>
                      </div>
                      {a.accepted ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckIcon width={12} height={12} />
                          Accepted
                        </span>
                      ) : q.authorId === meId ? (
                        <button
                          type="button"
                          onClick={() => accept(a.id)}
                          className="shrink-0 text-[11px] text-brand underline"
                        >
                          Accept
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {replyTo === q.id ? (
                <form
                  action={(fd) => answer(q.id, fd)}
                  className="flex flex-col gap-2 border-t border-border pt-3"
                >
                  <Textarea name="body" rows={2} maxLength={5000} required placeholder="Your answer…" />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={busy} className="px-2.5 py-1.5 text-xs">
                      {busy ? "Posting…" : "Post answer"}
                    </Button>
                    <Button type="button" variant="outline" className="px-2.5 py-1.5 text-xs" onClick={() => setReplyTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setReplyTo(q.id)}
                  className="w-fit text-xs font-medium text-brand hover:underline"
                >
                  Answer
                </button>
              )}
            </Card>
          );
        })
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this question?"
        body={pending ? `"${pending.title}" and all its answers will be removed.` : undefined}
        confirmLabel="Delete question"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
