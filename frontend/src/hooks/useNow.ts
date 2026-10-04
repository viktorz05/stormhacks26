"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  // Align ticks to the wall-clock second so the display never lags.
  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    onChange();
    interval = setInterval(onChange, 1000);
  }, 1000 - (Date.now() % 1000));
  return () => {
    clearTimeout(timeout);
    clearInterval(interval);
  };
}

const getSnapshot = () => Math.floor(Date.now() / 1000) * 1000;
const getServerSnapshot = () => null;

/**
 * Current time, ticking once per second. `null` during SSR and hydration so
 * the server's clock never leaks into the markup.
 */
export function useNow(): Date | null {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ms === null ? null : new Date(ms);
}
