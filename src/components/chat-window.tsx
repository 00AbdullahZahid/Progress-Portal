"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postMessage, editMessage, deleteMessage } from "@/lib/actions/chat";
import { Avatar } from "./avatar";
import { Button, Input, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { SendIcon, EditIcon, TrashIcon, XIcon, CheckIcon, ChatIcon } from "./icons";

type Channel = { id: string; name: string; kind: string };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; color: string };
};

export function ChatWindow({
  channels,
  activeId,
  initialMessages,
  meId,
  isAdmin,
  tz = "Asia/Karachi",
}: {
  channels: Channel[];
  activeId: string;
  initialMessages: Message[];
  members: { id: string; name: string; color: string }[];
  meId: string;
  isAdmin: boolean;
  tz?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTs = useRef(initialMessages.at(-1)?.createdAt ?? "");

  useEffect(() => {
    setMessages(initialMessages);
    lastTs.current = initialMessages.at(-1)?.createdAt ?? "";
    setEditingId(null);
  }, [activeId, initialMessages]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/chat?channelId=${activeId}&after=${encodeURIComponent(lastTs.current)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages?.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m: Message) => !seen.has(m.id));
            if (!fresh.length) return prev;
            lastTs.current = fresh[fresh.length - 1].createdAt;
            return [...prev, ...fresh];
          });
        }
      } catch {}
    }, 4000);
    return () => clearInterval(timer);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    const fd = new FormData();
    fd.set("channelId", activeId);
    fd.set("body", draft);
    const previous = draft;
    setDraft("");
    try {
      const res = await postMessage(fd);
      if (!res.ok) {
        toast(res.error, "error");
        setDraft(previous);
        return;
      }
      consolidateFresh();
    } catch {
      toast("Could not send your message. Please try again.", "error");
      setDraft(previous);
    } finally {
      setSending(false);
      router.refresh();
    }
  }

  /** Pull any new messages for the active channel and merge them in. */
  async function consolidateFresh() {
    try {
      const res = await fetch(
        `/api/chat?channelId=${activeId}&after=${encodeURIComponent(lastTs.current)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m: Message) => !seen.has(m.id));
          if (fresh.length) lastTs.current = fresh[fresh.length - 1].createdAt;
          return [...prev, ...fresh];
        });
      }
    } catch {}
  }

  async function saveEdit(messageId: string) {
    if (!editDraft.trim() || savingEdit) return;
    const body = editDraft.trim();
    const fd = new FormData();
    fd.set("messageId", messageId);
    fd.set("body", body);
    setSavingEdit(true);
    try {
      const res = await editMessage(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body } : m)));
      setEditingId(null);
      setEditDraft("");
      toast("Message updated", "success");
      router.refresh();
    } catch {
      toast("Could not update the message. Please try again.", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    const fd = new FormData();
    fd.set("messageId", id);
    try {
      const res = await deleteMessage(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast("Message deleted", "success");
      router.refresh();
    } catch {
      toast("Could not delete the message. Please try again.", "error");
    }
  }

  function groupByDay(msgs: Message[]) {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of msgs) {
      const day = new Date(m.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: tz,
      });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }

  return (
    <div className="flex h-[calc(100dvh-15rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface md:h-[calc(100dvh-9rem)]">
      {/* Channel tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/chat?ch=${c.id}`)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              c.id === activeId
                ? "bg-brand-soft text-brand"
                : "text-muted hover:bg-surface2"
            }`}
          >
            {c.kind === "project" ? "Project: " : "# "}
            {c.name}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <ChatIcon width={40} height={40} className="text-muted" />
            <p className="mt-3 font-medium">No messages yet</p>
            <p className="mt-1 text-sm text-muted">Say hello to start the conversation.</p>
          </div>
        ) : (
          groupByDay(messages).map((group) => (
          <div key={group.day}>
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium text-muted">{group.day}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {group.items.map((m) => {
              const mine = m.author.id === meId;
              const canDelete = mine || isAdmin;
              const isEditing = editingId === m.id;
              return (
                <div
                  key={m.id}
                  className={`group flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar user={m.author} size="sm" />
                  <div className={`min-w-0 max-w-[80%] md:max-w-[70%] ${mine ? "text-right" : ""}`}>
                    <p className="mb-0.5 text-[11px] text-muted">
                      {m.author.name} ·{" "}
                      {new Date(m.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: tz,
                      })}
                    </p>

                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit(m.id);
                        }}
                        className={`inline-flex w-full max-w-sm flex-col gap-2 rounded-2xl border border-border bg-surface2/60 p-2 ${
                          mine ? "items-end" : "items-start"
                        }`}
                      >
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={2}
                          maxLength={4000}
                          autoFocus
                          className="resize-none"
                        />
                        <div className="flex gap-1.5">
                          <Button type="submit" disabled={savingEdit} className="px-2 py-1 text-xs">
                            <CheckIcon width={14} height={14} />
                            {savingEdit ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="px-2 py-1 text-xs"
                            onClick={() => setEditingId(null)}
                          >
                            <XIcon width={14} height={14} />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p
                          className={`inline-block break-words rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? "rounded-tr-sm bg-brand text-white"
                              : "rounded-tl-sm bg-surface2"
                          }`}
                        >
                          {m.body}
                        </p>
                        {(mine || canDelete) && (
                          <div
                            className={`mt-1 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            {mine ? (
                              <button
                                type="button"
                                title="Edit message"
                                onClick={() => {
                                  setEditingId(m.id);
                                  setEditDraft(m.body);
                                }}
                                className="rounded-md p-1 text-muted transition-colors hover:bg-surface2 hover:text-ink"
                              >
                                <EditIcon width={14} height={14} />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                title="Delete message"
                                onClick={() => setPendingDelete(m)}
                                className="rounded-md p-1 text-muted transition-colors hover:bg-surface2 hover:text-rose-600"
                              >
                                <TrashIcon width={14} height={14} />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message..."
          maxLength={4000}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={sending || !draft.trim()} className="shrink-0">
          <SendIcon width={16} height={16} />
          Send
        </Button>
      </form>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this message?"
        body={
          pendingDelete
            ? `"${pendingDelete.body.slice(0, 60)}${pendingDelete.body.length > 60 ? "…" : ""}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete message"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
