"use client";

import { useEffect, useSyncExternalStore } from "react";
import { clearFlash, peekFlash, subscribeFlash } from "@/lib/ui/flash";

const VISIBLE_FOR_MS = 5_000;

function serverSnapshot(): null {
  return null;
}

/**
 * Shows the message carried across a full page load, exactly once.
 *
 * It renders its own element instead of pushing a sonner toast: a toast created
 * while the page is still hydrating can be published before `Toaster` has
 * subscribed to sonner's queue, and then it is silently dropped.
 */
export function FlashNotice() {
  const message = useSyncExternalStore(subscribeFlash, peekFlash, serverSnapshot);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(clearFlash, VISIBLE_FOR_MS);

    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 max-w-sm rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg"
      role="status"
    >
      {message}
    </div>
  );
}
