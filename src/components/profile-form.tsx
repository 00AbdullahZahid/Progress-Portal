"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/profile";
import { Card, Button, Input, Select } from "./ui";
import { useToast } from "./toast";

const COLORS = [
  "#2563eb",
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
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function submit(fd: FormData) {
    startTransition(async () => {
      try {
        const res = (await updateProfile(fd)) as
          | { ok?: boolean; error?: string }
          | undefined;
        if (res?.error) {
          toast(res.error, "error");
          return;
        }
        toast("Profile saved", "success");
        router.refresh();
      } catch {
        toast("Could not save your profile. Please try again.", "error");
      }
    });
  }

  return (
    <Card>
      <form action={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium">
            Display name
          </label>
          <Input
            id="profile-name"
            name="name"
            defaultValue={user.name}
            required
            maxLength={40}
          />
        </div>

        <div>
          <label htmlFor="profile-color" className="mb-1.5 block text-sm font-medium">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <label
                key={c}
                className={`cursor-pointer rounded-full p-1 transition-transform ${
                  user.color === c ? "ring-2 ring-brand ring-offset-2 ring-offset-surface" : ""
                }`}
                title={c}
              >
                <input
                  type="radio"
                  name="color"
                  value={c}
                  defaultChecked={user.color === c}
                  className="sr-only"
                  aria-label={`Color ${c}`}
                />
                <span className="block h-7 w-7 rounded-full" style={{ backgroundColor: c }} />
              </label>
            ))}
            {COLORS.includes(user.color) ? null : (
              <label className="cursor-pointer rounded-full p-1 ring-2 ring-brand ring-offset-2 ring-offset-surface">
                <input
                  type="radio"
                  name="color"
                  value={user.color}
                  defaultChecked
                  className="sr-only"
                  aria-label="Current color"
                />
                <span
                  className="block h-7 w-7 rounded-full"
                  style={{ backgroundColor: user.color }}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="profile-tz" className="mb-1.5 block text-sm font-medium">
            Timezone <span className="text-xs text-muted">(used for streaks and &quot;today&quot;)</span>
          </label>
          <Select id="profile-tz" name="timezone" defaultValue={user.timezone}>
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
