import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ResourcesBoard } from "@/components/resources-board";

export const metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const me = await requireUser();

  const resources = await db.resource.findMany({
    include: { addedBy: { select: { id: true, name: true, color: true, image: true } } },
    orderBy: [{ subject: "asc" }, { createdAt: "desc" }],
    take: 500,
  });

  const subjects = [...new Set(resources.map((r) => r.subject))].sort();

  return (
    <div>
      <PageHeader
        title="Resources"
        subtitle="Past papers, books and links, organised by subject."
      />
      <ResourcesBoard
        resources={resources.map((r) => ({
          id: r.id,
          title: r.title,
          subject: r.subject,
          kind: r.kind,
          url: r.url,
          note: r.note,
          addedById: r.addedById,
          addedBy: r.addedBy,
        }))}
        meId={me.id}
        isAdmin={me.role === "admin"}
        subjects={subjects}
      />
    </div>
  );
}
