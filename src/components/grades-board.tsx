"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addGradeItem,
  createCourse,
  deleteCourse,
  deleteGradeItem,
} from "@/lib/actions/grades";
import { Button, Card, Input, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { ClassroomIcon, PlusIcon, XIcon, TrophyIcon } from "./icons";

export type GradeItemRow = {
  id: string;
  title: string;
  weight: number;
  score: number | null;
};

export type CourseRow = {
  id: string;
  name: string;
  credits: number;
  items: GradeItemRow[];
};

/** Convert a 0-100 percentage to a 4.0-scale grade point. */
function gradePoint(pct: number): number {
  if (pct >= 90) return 4;
  if (pct >= 80) return 3.5;
  if (pct >= 70) return 3;
  if (pct >= 60) return 2.5;
  if (pct >= 50) return 2;
  if (pct >= 40) return 1;
  return 0;
}

/** Weighted percentage across graded items; null when nothing is graded yet. */
function coursePercent(course: CourseRow): number | null {
  const graded = course.items.filter((i) => i.score !== null);
  const weight = graded.reduce((a, i) => a + i.weight, 0);
  if (weight === 0) return null;
  const total = graded.reduce((a, i) => a + (i.score ?? 0) * i.weight, 0);
  return total / weight;
}

export function GradesBoard({ courses }: { courses: CourseRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [addingCourse, setAddingCourse] = useState(false);
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<CourseRow | null>(null);

  async function submitCourse(fd: FormData) {
    setBusy(true);
    try {
      const res = await createCourse(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Course added", "success");
      setAddingCourse(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitItem(courseId: string, fd: FormData) {
    fd.set("courseId", courseId);
    setBusy(true);
    try {
      const res = await addGradeItem(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Item added", "success");
      setAddingItemTo(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeCourse() {
    if (!pendingCourse) return;
    const id = pendingCourse.id;
    setPendingCourse(null);
    const fd = new FormData();
    fd.set("courseId", id);
    const res = await deleteCourse(fd);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    router.refresh();
  }

  async function removeItem(itemId: string) {
    const fd = new FormData();
    fd.set("itemId", itemId);
    const res = await deleteGradeItem(fd);
    if (!res.ok) {
      toast(res.error, "error");
      return;
    }
    router.refresh();
  }

  // GPA across courses that have at least one graded item.
  const withGrades = courses
    .map((c) => ({ c, pct: coursePercent(c) }))
    .filter((x): x is { c: CourseRow; pct: number } => x.pct !== null);
  const credits = withGrades.reduce((a, x) => a + x.c.credits, 0);
  const gpa =
    credits > 0
      ? withGrades.reduce((a, x) => a + gradePoint(x.pct) * x.c.credits, 0) / credits
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {gpa !== null ? (
          <Card className="flex items-center gap-3 p-4">
            <TrophyIcon width={22} height={22} className="text-amber-500" />
            <div>
              <p className="text-xs text-muted">Predicted GPA</p>
              <p className="text-xl font-bold">{gpa.toFixed(2)}</p>
            </div>
          </Card>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className={gpa !== null ? "ml-auto" : ""}
          onClick={() => setAddingCourse((c) => !c)}
        >
          <PlusIcon width={16} height={16} />
          Add course
        </Button>
      </div>

      {addingCourse ? (
        <Card className="p-4">
          <form action={submitCourse} className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1">
              <span className="mb-1 block text-xs font-medium text-muted">Course name</span>
              <Input name="name" maxLength={100} required />
            </label>
            <label className="block w-24">
              <span className="mb-1 block text-xs font-medium text-muted">Credits</span>
              <Input type="number" name="credits" min={0} max={30} defaultValue={3} required />
            </label>
            <Button type="submit" disabled={busy} className="px-3 py-2 text-sm">
              {busy ? "Saving…" : "Add"}
            </Button>
            <Button type="button" variant="outline" className="px-3 py-2 text-sm" onClick={() => setAddingCourse(false)}>
              Cancel
            </Button>
          </form>
        </Card>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          icon={<ClassroomIcon />}
          title="No courses yet"
          hint="Add your courses with their weights to track and predict your GPA. Only you can see this."
        />
      ) : (
        courses.map((course) => {
          const pct = coursePercent(course);
          return (
            <Card key={course.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{course.name}</h2>
                  <p className="text-xs text-muted">
                    {course.credits} credits
                    {pct !== null ? ` · ${pct.toFixed(1)}% · ${gradePoint(pct).toFixed(1)} GP` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-2.5 py-1.5 text-xs"
                    onClick={() => setAddingItemTo(addingItemTo === course.id ? null : course.id)}
                  >
                    <PlusIcon width={14} height={14} />
                    Item
                  </Button>
                  <button
                    type="button"
                    onClick={() => setPendingCourse(course)}
                    title="Delete course"
                    aria-label="Delete course"
                    className="text-muted transition-colors hover:text-rose-600"
                  >
                    <XIcon width={15} height={15} />
                  </button>
                </div>
              </div>

              {course.items.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {course.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{i.title}</span>
                      <span className="text-xs text-muted">{i.weight}%</span>
                      <span className="w-12 text-right font-medium">
                        {i.score === null ? "—" : `${i.score}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i.id)}
                        title="Remove item"
                        aria-label="Remove item"
                        className="text-muted transition-colors hover:text-rose-600"
                      >
                        <XIcon width={14} height={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No graded items yet.</p>
              )}

              {addingItemTo === course.id ? (
                <form
                  action={(fd) => submitItem(course.id, fd)}
                  className="flex flex-wrap items-end gap-3 border-t border-border pt-3"
                >
                  <label className="block min-w-[10rem] flex-1">
                    <span className="mb-1 block text-xs font-medium text-muted">Title</span>
                    <Input name="title" maxLength={100} required placeholder="e.g. Final exam" />
                  </label>
                  <label className="block w-24">
                    <span className="mb-1 block text-xs font-medium text-muted">Weight %</span>
                    <Input type="number" name="weight" min={0} max={100} required />
                  </label>
                  <label className="block w-24">
                    <span className="mb-1 block text-xs font-medium text-muted">Score %</span>
                    <Input type="number" name="score" min={0} max={100} placeholder="—" />
                  </label>
                  <Button type="submit" disabled={busy} className="px-3 py-2 text-sm">
                    Add
                  </Button>
                </form>
              ) : null}
            </Card>
          );
        })
      )}

      <ConfirmDialog
        open={pendingCourse !== null}
        title="Delete this course?"
        body={pendingCourse ? `"${pendingCourse.name}" and its grade items will be removed.` : undefined}
        confirmLabel="Delete course"
        onConfirm={removeCourse}
        onCancel={() => setPendingCourse(null)}
      />
    </div>
  );
}
