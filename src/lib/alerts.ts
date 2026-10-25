import { after } from "next/server";
import { sendDigest } from "./notify";

/**
 * Queue an instant webhook alert after the action finishes. Using `after()`
 * keeps the member's form submission fast while still giving the webhook a
 * chance to send before the serverless function is frozen.
 */
export function queueWebhookAlert(text: string): void {
  if (!process.env.NOTIFY_WEBHOOK_URL) return;
  try {
    after(async () => {
      await sendDigest(text);
    });
  } catch {
    // Outside a request context (for example a one-off script), fall back to a
    // best-effort fire-and-forget request.
    void sendDigest(text);
  }
}
