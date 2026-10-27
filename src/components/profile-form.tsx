"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/profile";
import { uploadFile } from "@/lib/upload-client";
import { Card, Button, Input, Select } from "./ui";
import { useToast } from "./toast";
import { Avatar } from "./avatar";

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
  user: { name: string; color: string; timezone: string; image?: string | null };
  timezones: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [image, setImage] = useState<string | null>(user.image ?? null);
  // Keep the choice local so the ring and avatar preview update on click,
  // before the save round-trip finishes.
  const [color, setColor] = useState(user.color);
  const [uploading, setUploading] = useState(false);
  const colorOptions = COLORS.includes(color) ? COLORS : [...COLORS, color];

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be under 2MB", "error");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const res = await uploadFile(file);
    setUploading(false);
    if (!res.ok) {
      toast(res.error, "error");
      e.target.value = "";
      return;
    }
    setImage(res.url);
  }

  function submit(fd: FormData) {
    // Always send the image field: a URL keeps/sets it, an empty string clears it.
    fd.set("image", image ?? "");
    // The controlled radios already carry this, but set it explicitly so the
    // saved colour can never disagree with the preview.
    fd.set("color", color);
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
          <label className="mb-1.5 block text-sm font-medium">
            Profile picture
          </label>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar user={{ name: user.name, color, image }} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                disabled={uploading}
                className="w-full max-w-full min-w-0 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-ink hover:file:bg-brand/90 disabled:opacity-50"
              />
              <span className="text-xs text-muted">
                {uploading ? "Uploading…" : "Max 2MB"}
              </span>
              {image ? (
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="self-start text-xs text-muted underline hover:text-ink"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>
        </div>

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
          <div id="profile-color" role="radiogroup" aria-label="Profile color" className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <label
                key={c}
                className={`cursor-pointer rounded-full p-1 transition-transform ${
                  color === c
                    ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
                    : "hover:scale-105"
                }`}
                title={c}
              >
                <input
                  type="radio"
                  name="color"
                  value={c}
                  checked={color === c}
                  onChange={() => setColor(c)}
                  className="sr-only"
                  aria-label={`Color ${c}`}
                />
                <span className="block h-7 w-7 rounded-full" style={{ backgroundColor: c }} />
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Used for your avatar and activity charts. Save to apply it everywhere.
          </p>
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
