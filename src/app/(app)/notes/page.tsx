import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { NotesBoard } from "@/components/notes-board";

export const metadata = { title: "Notes" };

export default async function NotesPage() {
  const me = await requireUser();

  const [notes, subjectRows] = await Promise.all([
    db.note.findMany({
      include: {
        author: { select: { id: true, name: true, color: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.note.findMany({
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    }),
  ]);

  const rows = notes.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    subject: n.subject,
    image: n.image,
    fileUrl: n.fileUrl,
    fileName: n.fileName,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    authorId: n.authorId,
    author: n.author,
  }));

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle="Shared study notes. Anyone can add or edit; only the author or an admin can delete."
      />
      <NotesBoard
        notes={rows}
        meId={me.id}
        isAdmin={me.role === "admin"}
        subjects={subjectRows.map((r) => r.subject)}
      />
    </div>
  );
}
