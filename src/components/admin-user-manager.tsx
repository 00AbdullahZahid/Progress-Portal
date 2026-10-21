"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateUser } from "@/lib/actions/admin";
import { Card, Button, Input, Select } from "./ui";
import { Avatar } from "./avatar";
import { ShieldIcon } from "./icons";

type Member = {
  id: string;
  handle: string;
  name: string;
  role: string;
  color: string;
  timezone: string;
};

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Orange", value: "#f97316" },
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Pink", value: "#ec4899" },
  { name: "Amber", value: "#eab308" },
  { name: "Red", value: "#ef4444" },
];

const TIMEZONES = [
  "Asia/Karachi",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function AdminUserManager({
  members,
  meId,
}: {
  members: Member[];
  meId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ id: string; type: "ok" | "err"; text: string } | null>(null);

  function save(fd: FormData) {
    const id = String(fd.get("userId"));
    setMsg(null);
    startTransition(async () => {
      const res = (await adminUpdateUser(fd)) as { ok?: boolean; error?: string } | undefined;
      if (res?.error) setMsg({ id, type: "err", text: res.error });
      else setMsg({ id, type: "ok", text: "Saved." });
      router.refresh();
    });
  }

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <ShieldIcon width={18} height={18} className="text-amber-500" />
        Manage users
      </h2>
      <p className="mb-4 text-sm text-muted">
        Edit anyone&apos;s name, username, color, timezone, or role. Changes apply right away.
      </p>

      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <form
            action={save}
            key={m.id}
            className="rounded-xl border border-border bg-surface2/40 p-3"
          >
            <input type="hidden" name="userId" value={m.id} />
            <div className="flex items-start gap-3">
              <div className="hidden shrink-0 pt-6 sm:block">
                <Avatar user={{ name: m.name, color: m.color }} size="lg" />
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Name</span>
                  <Input name="name" defaultValue={m.name} required maxLength={40} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Username</span>
                  <Input name="handle" defaultValue={m.handle} required />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Role</span>
                  <Select name="role" defaultValue={m.role}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Color</span>
                  <Select name="color" defaultValue={m.color}>
                    {COLORS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-medium text-muted">Timezone</span>
                  <Select name="timezone" defaultValue={m.timezone}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <Button type="submit" disabled={pending} className="w-full">
                    {pending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
            {msg?.id === m.id ? (
              <p
                className={`mt-2 text-xs ${
                  msg.type === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {msg.text}
              </p>
            ) : null}
            {m.id === meId ? (
              <p className="mt-1 text-[11px] text-muted">This is you.</p>
            ) : null}
          </form>
        ))}
      </div>
    </Card>
  );
}
