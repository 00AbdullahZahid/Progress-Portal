"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/profile";
import { Card, Button, Input, Select } from "./ui";

const COLORS = [
  "#6366f1",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#eab308",
  "#ef4444",
];

export function ProfileForm({
  user,
  timezones,
}: {
  user: { name: string; color: string; timezone: string };
  timezones: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    startTransition(async () => {
      await updateProfile(fd);
      router.refresh();
    });
  }

  return (
    <Card>
      <form action={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Display name</label>
          <Input name="name" defaultValue={user.name} required maxLength={40} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <label
                key={c}
                className={`cursor-pointer rounded-full p-1 transition-transform ${
                  user.color === c ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
                }`}
              >
                <input
                  type="radio"
                  name="color"
                  value={c}
                  defaultChecked={user.color === c}
                  className="sr-only"
                />
                <span className="block h-7 w-7 rounded-full" style={{ backgroundColor: c }} />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Timezone <span className="text-xs text-muted">(used for streaks and "today")</span>
          </label>
          <Select name="timezone" defaultValue={user.timezone}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Card>
  );
}
