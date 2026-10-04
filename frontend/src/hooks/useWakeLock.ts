"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `enabled` (an alarm on the nightstand is useless if
 * the phone sleeps). Silently does nothing where the Wake Lock API is missing.
 */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) void sentinel.release();
        else lock = sentinel;
      } catch {
        // Denied (battery saver, not visible, etc.). Nothing to do.
      }
    };

    // The browser drops the lock whenever the tab is hidden.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void lock?.release();
    };
  }, [enabled]);
}
