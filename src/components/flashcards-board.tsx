"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFlashcard,
  deleteFlashcard,
  reviewFlashcard,
} from "@/lib/actions/flashcards";
import { Button, Card, Input, Textarea, Select, EmptyState } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { CardIcon, PlusIcon, XIcon, CheckIcon } from "./icons";

export type FlashcardRow = {
  id: string;
  deck: string;
  front: string;
  back: string;
  createdById: string;
  due: boolean;
  box: number;
};

export function FlashcardsBoard({
  cards,
  decks,
  meId,
  isAdmin,
}: {
  cards: FlashcardRow[];
  decks: string[];
  meId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deck, setDeck] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [pending, setPending] = useState<FlashcardRow | null>(null);

  const dueCards = useMemo(() => cards.filter((c) => c.due), [cards]);
  const reviewDeck = useMemo(
    () => (deck ? dueCards.filter((c) => c.deck === deck) : dueCards),
    [dueCards, deck]
  );

  async function submit(fd: FormData) {
    setBusy(true);
    try {
      const res = await createFlashcard(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Card added", "success");
      setCreating(false);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pending) return;
    const id = pending.id;
    setPending(null);
    const fd = new FormData();
    fd.set("cardId", id);
    try {
      const res = await deleteFlashcard(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Card removed", "success");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    }
  }

  async function answer(correct: boolean) {
    const card = reviewDeck[index];
    if (!card) return;
    const fd = new FormData();
    fd.set("cardId", card.id);
    fd.set("correct", correct ? "true" : "false");
    // Fire and forget; advance eagerly for a snappy quiz.
    void reviewFlashcard(fd);
    setFlipped(false);
    if (index + 1 >= reviewDeck.length) {
      setReviewing(false);
      setIndex(0);
      toast("Review complete", "success");
      router.refresh();
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (reviewing) {
    const card = reviewDeck[index];
    if (!card) {
      return (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted">Nothing left to review here.</p>
          <Button
            type="button"
            variant="outline"
            className="mx-auto mt-3"
            onClick={() => {
              setReviewing(false);
              setIndex(0);
            }}
          >
            Back
          </Button>
        </Card>
      );
    }
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <p className="text-xs text-muted">
          {index + 1} / {reviewDeck.length} · {card.deck}
        </p>
        <p className="min-h-[3rem] text-lg font-medium">
          {flipped ? card.back : card.front}
        </p>
        {flipped ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="px-4"
              onClick={() => answer(false)}
            >
              <XIcon width={15} height={15} />
              Wrong
            </Button>
            <Button type="button" className="px-4" onClick={() => answer(true)}>
              <CheckIcon width={15} height={15} />
              Correct
            </Button>
          </div>
        ) : (
          <Button type="button" className="px-5" onClick={() => setFlipped(true)}>
            Show answer
          </Button>
        )}
        <button
          type="button"
          onClick={() => {
            setReviewing(false);
            setIndex(0);
            setFlipped(false);
          }}
          className="text-xs text-muted underline hover:text-ink"
        >
          End review
        </button>
      </Card>
    );
  }

  const byDeck = new Map<string, FlashcardRow[]>();
  for (const c of cards) {
    const list = byDeck.get(c.deck) ?? [];
    list.push(c);
    byDeck.set(c.deck, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Button
          type="button"
          disabled={reviewDeck.length === 0}
          onClick={() => {
            setReviewing(true);
            setIndex(0);
            setFlipped(false);
          }}
        >
          <CardIcon width={16} height={16} />
          Review due ({reviewDeck.length})
        </Button>
        <Select
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
          aria-label="Filter deck"
          className="w-auto"
        >
          <option value="">All decks</option>
          {decks.map((d) => (
            <option key={d} value={d}>
              {d}
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
          New card
        </Button>
      </Card>

      {creating ? (
        <Card className="p-4">
          <form action={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">Deck</span>
                <Input name="deck" maxLength={60} required list="flash-decks" placeholder="e.g. Biology" />
                <datalist id="flash-decks">
                  {decks.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">Front</span>
                <Textarea name="front" rows={2} maxLength={500} required />
              </label>
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted">Back</span>
                <Textarea name="back" rows={2} maxLength={1000} required />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="px-3 py-1.5 text-sm">
                <PlusIcon width={15} height={15} />
                {busy ? "Saving…" : "Add card"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="px-3 py-1.5 text-sm"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {cards.length === 0 ? (
        <EmptyState
          icon={<CardIcon />}
          title="No flashcards yet"
          hint="Create a deck and add cards. Reviews are scheduled with spaced repetition."
        />
      ) : (
        [...byDeck.entries()].map(([deckName, list]) => (
          <Card key={deckName} className="p-4">
            <h2 className="mb-3 font-semibold">
              {deckName}{" "}
              <span className="text-xs font-normal text-muted">({list.length})</span>
            </h2>
            <ul className="flex flex-col divide-y divide-border">
              {list.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.front}</p>
                    <p className="truncate text-xs text-muted">{c.back}</p>
                  </div>
                  {c.due ? (
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] text-brand">
                      due
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted">box {c.box}</span>
                  )}
                  {c.createdById === meId || isAdmin ? (
                    <button
                      type="button"
                      onClick={() => setPending(c)}
                      title="Delete card"
                      aria-label="Delete card"
                      className="text-muted transition-colors hover:text-rose-600"
                    >
                      <XIcon width={15} height={15} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this card?"
        body={pending ? `"${pending.front}" will be removed for everyone.` : undefined}
        confirmLabel="Delete card"
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
