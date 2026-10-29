"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addGradeItem,
  createCourse,
  deleteCourse,
  deleteGradeItem,
  saveGpaScale,
  updateCourse,
  updateGradeItem,
} from "@/lib/actions/grades";
import {
  DEFAULT_GPA_SCALE,
  coursePercent,
  gradePointFor,
  neededOnRemaining,
  weightWarning,
  type GradeBand,
} from "@/lib/grades";
import { Button, Card, Input, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { Dialog } from "./dialog";
import { useToast } from "./toast";
import {
  AlertIcon,
  ClassroomIcon,
  EditIcon,
  PlusIcon,
  RefreshIcon,
  TargetIcon,
  TrophyIcon,
  XIcon,
} from "./icons";

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

const DEFAULT_TARGET = 90;

function formatNeeded(course: CourseRow, target: number): string {
  const result = neededOnRemaining(course.items, target);
  if (!result) return "Add an ungraded item to predict this target.";
  if (result.neededPercent <= 0) return "Target already secured.";
  if (result.neededPercent > 100)
    return `Not reachable — would need ${result.neededPercent.toFixed(1)}% on the remaining ${result.remainingWeight}%.`;
  return `Need ${result.neededPercent.toFixed(1)}% on the remaining ${result.remainingWeight}%.`;
}

export function GradesBoard({
  courses,
  gpaScale,
}: {
  courses: CourseRow[];
  gpaScale: GradeBand[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [courseDialog, setCourseDialog] = useState<CourseRow | "new" | null>(
    null
  );
  const [itemDialog, setItemDialog] = useState<
    { courseId: string; item: GradeItemRow | null } | null
  >(null);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [scaleDraft, setScaleDraft] = useState<GradeBand[]>(gpaScale);
  const [busy, setBusy] = useState(false);
  const [pendingCourse, setPendingCourse] = useState<CourseRow | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>({});

  const withGrades = useMemo(
    () =>
      courses
        .map((course) => ({ course, pct: coursePercent(course.items) }))
        .filter((row): row is { course: CourseRow; pct: number } => row.pct !== null),
    [courses]
  );
  const credits = withGrades.reduce((sum, row) => sum + row.course.credits, 0);
  const gpa =
    credits > 0
      ? withGrades.reduce(
          (sum, row) => sum + gradePointFor(row.pct, gpaScale) * row.course.credits,
          0
        ) / credits
      : null;

  function openScale() {
    setScaleDraft(gpaScale.map((band) => ({ ...band })));
    setScaleOpen(true);
  }

  async function submitCourse(fd: FormData) {
    const editing = courseDialog !== "new" && courseDialog !== null;
    if (editing) fd.set("courseId", courseDialog.id);
    setBusy(true);
    try {
      const res = editing ? await updateCourse(fd) : await createCourse(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(editing ? "Course updated" : "Course added", "success");
      setCourseDialog(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitItem(fd: FormData) {
    if (!itemDialog) return;
    const editing = itemDialog.item !== null;
    if (editing) fd.set("itemId", itemDialog.item!.id);
    else fd.set("courseId", itemDialog.courseId);
    setBusy(true);
    try {
      const res = editing ? await updateGradeItem(fd) : await addGradeItem(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(editing ? "Item updated" : "Item added", "success");
      setItemDialog(null);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function submitScale(reset: boolean) {
    const fd = new FormData();
    if (reset) fd.set("reset", "1");
    else fd.set("scale", JSON.stringify(scaleDraft));
    setBusy(true);
    try {
      const res = await saveGpaScale(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast(reset ? "Using the default scale" : "Grade scale saved", "success");
      setScaleOpen(false);
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

  const editingCourse = courseDialog !== "new" ? courseDialog : null;
  const editingItem = itemDialog?.item ?? null;

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
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={openScale}
          >
            <TargetIcon width={16} height={16} />
            Grade scale
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            onClick={() => setCourseDialog("new")}
          >
            <PlusIcon width={16} height={16} />
            Add course
          </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<ClassroomIcon />}
          title="No courses yet"
          hint="Add your courses with their weights to track and predict your GPA. Only you can see this."
        />
      ) : (
        courses.map((course) => {
          const pct = coursePercent(course.items);
          const warning = weightWarning(course.items);
          const target = targets[course.id] ?? DEFAULT_TARGET;
          return (
            <Card key={course.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold">{course.name}</h2>
                  <p className="text-xs text-muted">
                    {course.credits} credits
                    {pct !== null
                      ? ` · ${pct.toFixed(1)}% · ${gradePointFor(pct, gpaScale).toFixed(1)} GP`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCourseDialog(course)}
                    title="Edit course"
                    aria-label="Edit course"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-ink"
                  >
                    <EditIcon width={15} height={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingCourse(course)}
                    title="Delete course"
                    aria-label="Delete course"
                    className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                  >
                    <XIcon width={15} height={15} />
                  </button>
                </div>
              </div>

              {warning ? (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                  <AlertIcon width={14} height={14} className="mt-0.5 shrink-0" />
                  {warning}
                </p>
              ) : null}

              {course.items.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {course.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 py-2 text-sm sm:gap-3">
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted">{item.weight}%</span>
                      <span className="w-10 shrink-0 text-right font-medium sm:w-12">
                        {item.score === null ? "—" : `${item.score}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemDialog({ courseId: course.id, item })}
                        title="Edit item"
                        aria-label={`Edit ${item.title}`}
                        className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink"
                      >
                        <EditIcon width={13} height={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                        aria-label={`Remove ${item.title}`}
                        className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                      >
                        <XIcon width={13} height={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No graded items yet.</p>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => setItemDialog({ courseId: course.id, item: null })}
                >
                  <PlusIcon width={14} height={14} />
                  Add item
                </Button>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted">
                  Target
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={target}
                    onChange={(event) =>
                      setTargets((current) => ({
                        ...current,
                        [course.id]: Number(event.target.value),
                      }))
                    }
                    className="w-16 py-1 text-xs"
                    aria-label={`Target percentage for ${course.name}`}
                  />
                  %
                </label>
                <p className="w-full text-xs text-muted sm:w-auto">
                  {formatNeeded(course, target)}
                </p>
              </div>
            </Card>
          );
        })
      )}

      <Dialog
        open={courseDialog !== null}
        title={editingCourse ? "Edit course" : "Add course"}
        description={
          editingCourse
            ? "Update the course name or its credit weight."
            : "Only you can see your courses."
        }
        onClose={() => setCourseDialog(null)}
      >
        <form id="grade-course-form" action={submitCourse} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Course name</span>
            <Input
              name="name"
              maxLength={100}
              defaultValue={editingCourse?.name ?? ""}
              required
              data-autofocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Credits</span>
            <Input
              type="number"
              name="credits"
              min={0}
              max={30}
              defaultValue={editingCourse?.credits ?? 3}
              required
            />
          </label>
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Saving…" : editingCourse ? "Save changes" : "Add course"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setCourseDialog(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={itemDialog !== null}
        title={editingItem ? "Edit grade item" : "Add grade item"}
        description="Weight is the share of the course grade. Leave the score blank until it is graded."
        onClose={() => setItemDialog(null)}
      >
        <form id="grade-item-form" action={submitItem} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Title</span>
            <Input
              name="title"
              maxLength={100}
              defaultValue={editingItem?.title ?? ""}
              placeholder="e.g. Final exam"
              required
              data-autofocus
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Weight %</span>
              <Input
                type="number"
                name="weight"
                min={0}
                max={100}
                defaultValue={editingItem?.weight ?? ""}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Score %</span>
              <Input
                type="number"
                name="score"
                min={0}
                max={100}
                defaultValue={editingItem?.score ?? ""}
                placeholder="—"
              />
            </label>
          </div>
          <div className="mt-1 flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? "Saving…" : editingItem ? "Save changes" : "Add item"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setItemDialog(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={scaleOpen}
        title="Grade scale"
        description="Set the percentage needed for each grade point. This is private to you."
        onClose={() => setScaleOpen(false)}
        size="lg"
      >
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted">
            <span>Label</span>
            <span>Min %</span>
            <span>Points</span>
            <span className="w-9" />
          </div>
          {scaleDraft.map((band, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
            >
              <Input
                value={band.label ?? ""}
                maxLength={12}
                placeholder="A"
                aria-label={`Band ${index + 1} label`}
                onChange={(event) =>
                  setScaleDraft((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, label: event.target.value } : row
                    )
                  )
                }
                className="py-1.5 text-sm"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={band.minPercent}
                aria-label={`Band ${index + 1} minimum percentage`}
                onChange={(event) =>
                  setScaleDraft((current) =>
                    current.map((row, i) =>
                      i === index
                        ? { ...row, minPercent: Number(event.target.value) }
                        : row
                    )
                  )
                }
                className="py-1.5 text-sm"
              />
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={band.points}
                aria-label={`Band ${index + 1} grade points`}
                onChange={(event) =>
                  setScaleDraft((current) =>
                    current.map((row, i) =>
                      i === index ? { ...row, points: Number(event.target.value) } : row
                    )
                  )
                }
                className="py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setScaleDraft((current) => current.filter((_, i) => i !== index))
                }
                disabled={scaleDraft.length <= 2}
                title="Remove band"
                aria-label={`Remove band ${index + 1}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-rose-600 disabled:opacity-40"
              >
                <XIcon width={14} height={14} />
              </button>
            </div>
          ))}
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="px-3 py-1.5 text-xs"
              disabled={scaleDraft.length >= 20}
              onClick={() =>
                setScaleDraft((current) => [
                  ...current,
                  { minPercent: 0, points: 0, label: "" },
                ])
              }
            >
              <PlusIcon width={14} height={14} />
              Add band
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => setScaleDraft(DEFAULT_GPA_SCALE.map((band) => ({ ...band })))}
            >
              <RefreshIcon width={14} height={14} />
              Load defaults
            </Button>
          </div>
          <p className="text-xs text-muted">
            Bands must cover 0% and have unique minimum percentages. Points are capped at 10.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            className="flex-1"
            onClick={() => submitScale(false)}
          >
            {busy ? "Saving…" : "Save scale"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => submitScale(true)}
          >
            Use built-in scale
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={pendingCourse !== null}
        title="Delete this course?"
        body={
          pendingCourse
            ? `"${pendingCourse.name}" and its grade items will be removed.`
            : undefined
        }
        confirmLabel="Delete course"
        onConfirm={removeCourse}
        onCancel={() => setPendingCourse(null)}
      />
    </div>
  );
}
