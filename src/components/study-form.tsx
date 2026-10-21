"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logStudy } from "@/lib/actions/study";
import { Card, Button, Input, Textarea } from "./ui";
import { PlusIcon } from "./icons";
import { useToast } from "./toast";

export function StudyForm() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function action(fd: FormData) {
    setPending(true);
    try {
      const res = await logStudy(fd);
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      toast("Session logged", "success");
      formRef.current?.reset();
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <PlusIcon width={18} height={18} className="text-brand" />
        Log a session
      </h2>
      <form ref={formRef} action={action} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Subject</label>
          <Input name="subject" placeholder="e.g. React, System Design" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Minutes</label>
          <Input type="number" name="minutes" min={1} max={1440} placeholder="60" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Notes (optional)</label>
          <Textarea name="notes" rows={2} placeholder="What did you cover?" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Logging…" : "Log session"}
        </Button>
      </form>
    </Card>
  );
}
