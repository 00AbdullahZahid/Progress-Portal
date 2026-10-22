import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { nowMs } from "@/lib/dates";
import { PageHeader } from "@/components/ui";
import { FlashcardsBoard } from "@/components/flashcards-board";

export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const me = await requireUser();

  const [cards, reviews] = await Promise.all([
    db.flashcard.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, deck: true, front: true, back: true, createdById: true },
    }),
    db.flashcardReview.findMany({
      where: { userId: me.id },
      select: { cardId: true, box: true, dueAt: true },
    }),
  ]);

  const reviewByCard = new Map(reviews.map((r) => [r.cardId, r]));
  const nowTime = nowMs();

  const rows = cards.map((c) => {
    const r = reviewByCard.get(c.id);
    return {
      id: c.id,
      deck: c.deck,
      front: c.front,
      back: c.back,
      createdById: c.createdById,
      box: r?.box ?? 1,
      // A card with no review is due immediately.
      due: !r || r.dueAt.getTime() <= nowTime,
    };
  });

  const decks = [...new Set(cards.map((c) => c.deck))].sort();

  return (
    <div>
      <PageHeader
        title="Flashcards"
        subtitle="Shared decks with spaced repetition. Reviews are personal to you."
      />
      <FlashcardsBoard
        cards={rows}
        decks={decks}
        meId={me.id}
        isAdmin={me.role === "admin"}
      />
    </div>
  );
}
