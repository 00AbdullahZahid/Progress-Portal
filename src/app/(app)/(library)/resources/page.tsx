import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ResourcesBoard } from "@/components/resources-board";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const me = await requireUser();

  const resources = await db.resource.findMany({
    include: {
      addedBy: {
        select: { id: true, name: true, color: true, image: true },
      },
      favorites: { where: { userId: me.id }, select: { userId: true } },
      useful: { where: { userId: me.id }, select: { userId: true } },
      reads: { where: { userId: me.id }, select: { userId: true } },
      _count: { select: { useful: true } },
    },
    orderBy: [{ subject: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  const subjects = [...new Set(resources.map((r) => r.subject))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <ResourcesBoard
        resources={resources.map((r) => ({
          id: r.id,
          title: r.title,
          subject: r.subject,
          kind: r.kind,
          url: r.url,
          note: r.note,
          fileName: r.fileName,
          fileSize: r.fileSize,
          mime: r.mime,
          year: r.year,
          semester: r.semester,
          examType: r.examType,
          createdAt: r.createdAt.toISOString(),
          addedById: r.addedById,
          addedBy: r.addedBy,
          favorite: r.favorites.length > 0,
          useful: r.useful.length > 0,
          usefulCount: r._count.useful,
          read: r.reads.length > 0,
        }))}
        meId={me.id}
        isAdmin={me.role === "admin"}
        subjects={subjects}
      />
    </div>
  );
}
