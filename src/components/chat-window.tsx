"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { postMessage, editMessage, deleteMessage } from "@/lib/actions/chat";
import { Avatar } from "./avatar";
import { Button, Input, Textarea } from "./ui";
import { ConfirmDialog } from "./confirm-dialog";
import { useToast } from "./toast";
import { mentionTokenAt, type MentionToken } from "@/lib/mentions";
import { SendIcon, EditIcon, TrashIcon, XIcon, CheckIcon, ChatIcon } from "./icons";

type Channel = { id: string; name: string; kind: string };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; color: string; image?: string | null };
};
type Member = {
  id: string;
  handle: string;
  name: string;
  color: string;
  image?: string | null;
};
type ActiveMention = MentionToken & { index: number };

const MENTION_RE = /(^|[^a-z0-9_])@([a-z0-9_]{2,20})\b/gi;
/** How many member suggestions the composer shows at once. */
const MENTION_LIMIT = 6;

/**
 * Render message text with @mentions highlighted. Only handles that belong to
 * a member are styled; mentions of the signed-in member get a stronger style
 * so they are easy to spot in a long conversation.
 */
function MessageText({
  body,
  handles,
  meHandle,
  mine,
}: {
  body: string;
  handles: Set<string>;
  meHandle?: string;
  mine: boolean;
}) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(body)) !== null) {
    const handle = match[2];
    // Leave an arbitrary @word alone; only real members are mentions.
    if (!handles.has(handle.toLowerCase())) continue;

    const start = match.index + match[1].length;
    if (start > last) nodes.push(body.slice(last, start));
    const isMe = meHandle
      ? handle.toLowerCase() === meHandle.toLowerCase()
      : false;
    nodes.push(
      <span
        key={`mention-${index++}`}
        className={`rounded px-0.5 font-semibold ${
          mine
            ? // Invert against the accent bubble so the handle still changes
              // colour instead of inheriting the bubble's text colour.
              "bg-brand-ink/90 text-brand"
            : "bg-brand-soft text-brand"
        } ${isMe ? "underline decoration-2 underline-offset-2" : ""}`}
      >
        @{handle}
      </span>
    );
    last = start + handle.length + 1;
  }

  if (nodes.length === 0) return <>{body}</>;
  if (last < body.length) nodes.push(body.slice(last));
  return <>{nodes}</>;
}

export function ChatWindow({
  channels,
  activeId,
  initialMessages,
  members,
  meId,
  meHandle,
  isAdmin,
  tz = "Asia/Karachi",
}: {
  channels: Channel[];
  activeId: string;
  initialMessages: Message[];
  members: Member[];
  meId: string;
  meHandle?: string;
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
  const [mention, setMention] = useState<ActiveMention | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [shownChannel, setShownChannel] = useState(activeId);

  // Every member handle, used to decide which @words are real mentions.
  const memberHandles = new Set(members.map((m) => m.handle.toLowerCase()));

  // Suggestions for the @token under the caret. Handles that start with the
  // query rank above name matches, so "@sa" puts @sara first.
  const mentionQuery = mention?.query ?? "";
  const mentionOptions = mention
    ? members
        .filter((m) => m.id !== meId)
        .filter((m) => {
          if (!mentionQuery) return true;
          return (
            m.handle.toLowerCase().includes(mentionQuery) ||
            m.name.toLowerCase().includes(mentionQuery)
          );
        })
        .sort((a, b) => {
          if (!mentionQuery) return a.name.localeCompare(b.name);
          const rank = (m: Member) => {
            const handle = m.handle.toLowerCase();
            const name = m.name.toLowerCase();
            if (handle.startsWith(mentionQuery)) return 0;
            if (name.startsWith(mentionQuery)) return 1;
            return 2;
          };
          return rank(a) - rank(b) || a.name.localeCompare(b.name);
        })
        .slice(0, MENTION_LIMIT)
    : [];
  const activeMentionIndex =
    mention && mentionOptions.length > 0
      ? Math.min(mention.index, mentionOptions.length - 1)
      : 0;

  // When the channel changes, reset local state during render (the React-
  // sanctioned "adjust state on prop change" pattern) instead of in an effect.
  if (shownChannel !== activeId) {
    setShownChannel(activeId);
    setMessages(initialMessages);
    setEditingId(null);
    setMention(null);
  }

  /**
   * Replace the visible window with the server's latest copy.
   *
   * The full poll is authoritative: a message missing from it was deleted, and
   * a changed body is an edit. Keeping "local-only" messages here used to leave
   * a deleted newest message on screen until a manual reload.
   */
  function mergeWindow(incoming: Message[]) {
    setMessages((prev) => {
      if (!incoming.length) return [];
      const byId = new Map(prev.map((m) => [m.id, m]));
      return incoming.map((m) => {
        const old = byId.get(m.id);
        // Preserve identity when nothing changed so React can skip re-render.
        return old && old.body === m.body ? old : m;
      });
    });
  }

  /** Open/close the picker based on the @token at the caret. */
  function syncMention(value: string, caret: number) {
    const token = mentionTokenAt(value, caret);
    setMention((prev) => {
      if (!token) return null;
      // Keep the highlighted row when the token itself has not changed.
      if (
        prev &&
        prev.start === token.start &&
        prev.end === token.end &&
        prev.query === token.query
      ) {
        return prev;
      }
      return { ...token, index: 0 };
    });
  }

  function updateDraft(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setDraft(value);
    syncMention(value, e.target.selectionStart ?? value.length);
  }

  /** Replace the whole @token with the chosen member's handle. */
  function applyMention(member: Member) {
    if (!mention) return;
    const inserted = `@${member.handle} `;
    const next =
      draft.slice(0, mention.start) + inserted + draft.slice(mention.end);
    const caret = mention.start + inserted.length;
    setDraft(next);
    setMention(null);
    // The input is controlled, so move the caret after React paints the value.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(caret, caret);
    });
  }

  function onDraftKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!mention) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (mentionOptions.length === 0) return;
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setMention((prev) => {
        if (!prev) return prev;
        const current = Math.min(prev.index, mentionOptions.length - 1);
        const index =
          (current + delta + mentionOptions.length) % mentionOptions.length;
        return { ...prev, index };
      });
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setMention(null);
      return;
    }

    if ((e.key === "Enter" || e.key === "Tab") && mentionOptions.length > 0) {
      e.preventDefault();
      const choice =
        mentionOptions[Math.min(mention.index, mentionOptions.length - 1)];
      if (choice) applyMention(choice);
    }
  }

  /** Close the picker on any click outside the composer (or dropdown). */
  useEffect(() => {
    if (!mention) return;
    function onPointerDown(e: PointerEvent) {
      if (!composerRef.current?.contains(e.target as Node)) setMention(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mention]);

  /** Poll while the tab is visible; waits longer after repeated failures. */
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;

    async function poll() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(poll, 4000);
        return;
      }
      try {
        const res = await fetch(`/api/chat?channelId=${activeId}&full=1`, {
          cache: "no-store",
        });
        if (res.ok) {
          failures = 0;
          const data = await res.json();
          if (!cancelled && Array.isArray(data.messages)) mergeWindow(data.messages);
        } else {
          failures += 1;
        }
      } catch {
        failures += 1;
      }
      // Back off up to ~30s when the network is unhappy.
      const delay = Math.min(4000 * 2 ** Math.min(failures, 3), 30_000);
      if (!cancelled) timer = setTimeout(poll, delay);
    }

    timer = setTimeout(poll, 4000);
    function onVisible() {
      if (!document.hidden && !cancelled) {
        if (timer) clearTimeout(timer);
        poll();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
    setMention(null);
    try {
      const res = await postMessage(fd);
      if (!res.ok) {
        toast(res.error, "error");
        setDraft(previous);
        return;
      }
      await consolidateFresh();
    } catch {
      toast("Could not send your message. Please try again.", "error");
      setDraft(previous);
    } finally {
      setSending(false);
      router.refresh();
    }
  }

  /** Pull the latest window for the active channel and merge it in. */
  async function consolidateFresh() {
    try {
      const res = await fetch(`/api/chat?channelId=${activeId}&full=1`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) mergeWindow(data.messages);
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
    <div className="flex h-[calc(100dvh-13.5rem)] min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface md:h-[calc(100dvh-9rem)]">
      {/* Channel tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/chat?ch=${c.id}`)}
            className={`min-h-9 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
      <div
        className="flex-1 space-y-3 overflow-y-auto p-3 md:p-4"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
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
                              ? "rounded-tr-sm bg-brand text-brand-ink"
                              : "rounded-tl-sm bg-surface2"
                          }`}
                        >
                          <MessageText
                            body={m.body}
                            handles={memberHandles}
                            meHandle={meHandle}
                            mine={mine}
                          />
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
                                aria-label="Edit message"
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
                                aria-label="Delete message"
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
        <div ref={composerRef} className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            value={draft}
            onChange={updateDraft}
            onSelect={(e) =>
              syncMention(
                e.currentTarget.value,
                e.currentTarget.selectionStart ?? e.currentTarget.value.length
              )
            }
            onKeyDown={onDraftKeyDown}
            onBlur={(e) => {
              // Close when keyboard focus leaves the composer; a null
              // relatedTarget (page click) is handled by the pointer listener.
              const next = e.relatedTarget;
              if (next instanceof Node && !composerRef.current?.contains(next)) {
                setMention(null);
              }
            }}
            placeholder="Type a message… use @ to mention someone"
            aria-label="Message"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={mention !== null}
            aria-controls={mention ? "mention-listbox" : undefined}
            aria-activedescendant={
              mention && mentionOptions.length > 0
                ? `mention-option-${mentionOptions[activeMentionIndex].id}`
                : undefined
            }
            maxLength={4000}
            className="w-full"
          />

          {mention ? (
            <div className="absolute inset-x-0 bottom-full z-20 mb-1 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
              <ul
                id="mention-listbox"
                role="listbox"
                aria-label="Members to mention"
                className="max-h-64 overflow-y-auto py-1"
              >
                {mentionOptions.length === 0 ? (
                  <li role="presentation" className="px-3 py-2 text-sm text-muted">
                    {mention.query
                      ? `No member matches @${mention.query}`
                      : "No other members to mention"}
                  </li>
                ) : (
                  mentionOptions.map((m, i) => (
                    <li key={m.id} role="presentation">
                      <button
                        type="button"
                        id={`mention-option-${m.id}`}
                        role="option"
                        aria-selected={i === activeMentionIndex}
                        // Keep focus in the input so the caret stays put.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyMention(m)}
                        onMouseEnter={() =>
                          setMention((prev) => (prev ? { ...prev, index: i } : prev))
                        }
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          i === activeMentionIndex
                            ? "bg-brand-soft text-brand"
                            : "hover:bg-surface2"
                        }`}
                      >
                        <Avatar user={m} size="sm" />
                        <span className="min-w-0 flex-1 truncate">{m.name}</span>
                        <span className="shrink-0 text-xs opacity-70">@{m.handle}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
              {mentionOptions.length > 0 ? (
                <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">
                  ↑↓ to move · Enter to select · Esc to close
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
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
