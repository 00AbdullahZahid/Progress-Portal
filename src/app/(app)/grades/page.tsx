import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { GradesBoard } from "@/components/grades-board";
import { DEFAULT_GPA_SCALE, normalizeGpaScale } from "@/lib/grades";

export const metadata = { title: "Grades" };

export default async function GradesPage() {
  const me = await requireUser();

  // Private to the owner: only your courses are ever loaded.
  const courses = await db.course.findMany({
    where: { ownerId: me.id },
    include: { items: { orderBy: { createdAt: "asc" } } },
    orderBy: { id: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Grades"
        subtitle="Track course weights and predict your GPA. This page is private to you."
      />
      <GradesBoard
        gpaScale={normalizeGpaScale(me.gpaScale) ?? DEFAULT_GPA_SCALE}
        courses={courses.map((c) => ({
          id: c.id,
          name: c.name,
          credits: c.credits,
          items: c.items.map((i) => ({
            id: i.id,
            title: i.title,
            weight: i.weight,
            score: i.score,
          })),
        }))}
      />
    </div>
  );
}
