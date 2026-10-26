"use client";

import { useEffect, useRef } from "react";
import { markChatRead } from "@/lib/actions/chat";
import { CHAT_READ_EVENT } from "@/lib/events";

/**
 * Mounted by the chat page. The database marker is what makes the badge work
 * across devices; the event clears the badge immediately in this tab.
 */
export function ChatReadMarker() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markChatRead()
      .then(() => {
        window.dispatchEvent(new Event(CHAT_READ_EVENT));
      })
      .catch(() => {
        // The badge is non-critical; a failed marker must not disturb chat.
      });
  }, []);

  return null;
}
