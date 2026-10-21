"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postMessage } from "@/lib/actions/chat";
import { Avatar } from "./avatar";
import { Button, Input } from "./ui";
import { SendIcon } from "./icons";

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
}: {
  channels: Channel[];
  activeId: string;
  initialMessages: Message[];
  members: { id: string; name: string; color: string }[];
  meId: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTs = useRef(initialMessages.at(-1)?.createdAt ?? "");

  useEffect(() => {
    setMessages(initialMessages);
    lastTs.current = initialMessages.at(-1)?.createdAt ?? "";
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
    setDraft("");
    await postMessage(fd);
    // fetch latest immediately rather than waiting for the poll
    try {
      const res = await fetch(
        `/api/chat?channelId=${activeId}&after=${encodeURIComponent(lastTs.current)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m: Message) => !seen.has(m.id));
            if (fresh.length) lastTs.current = fresh[fresh.length - 1].createdAt;
            return [...prev, ...fresh];
          });
        }
      }
    } catch {}
    setSending(false);
    router.refresh();
  }

  function groupByDay(msgs: Message[]) {
    const out: { day: string; items: Message[] }[] = [];
    for (const m of msgs) {
      const day = new Date(m.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface md:h-[calc(100dvh-9rem)]">
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
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {groupByDay(messages).map((group) => (
          <div key={group.day}>
            <div className="my-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium text-muted">{group.day}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {group.items.map((m) => {
              const mine = m.author.id === meId;
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}
                >
                  <Avatar user={m.author} size="sm" />
                  <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                    <p className="mb-0.5 text-[11px] text-muted">
                      {m.author.name} ·{" "}
                      {new Date(m.createdAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p
                      className={`inline-block break-words rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-tr-sm bg-brand text-white"
                          : "rounded-tl-sm bg-surface2"
                      }`}
                    >
                      {m.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={4000}
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          <SendIcon width={16} height={16} />
          Send
        </Button>
      </form>
    </div>
  );
}
