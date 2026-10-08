"use client";

import { useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export const IDLE_LIMIT_MS = 10 * 60 * 1000;
const CHECK_EVERY_MS = 5_000;
const WRITE_THROTTLE_MS = 2_000;
const STORAGE_KEY = "kuppet_last_activity";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function readLast(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : Date.now();
  } catch {
    return Date.now();
  }
}

function writeLast(ts: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // Storage blocked — fall back to this tab's in-memory clock only.
  }
}

/**
 * Signs out only the current browser session after IDLE_LIMIT_MS without any
 * user activity. Last-activity time is shared through localStorage so work in
 * another tab of the same browser counts as activity, and it is re-checked
 * when the tab becomes visible again (covers sleeping laptops / throttled
 * background timers). Other users' sessions are never touched.
 */
export function useIdleLogout(enabled: boolean) {
  const { signOut } = useAuthActions();

  useEffect(() => {
    if (!enabled) return;

    let lastWrite = 0;
    let signingOut = false;
    writeLast(Date.now());

    const markActive = () => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE_MS) return;
      lastWrite = now;
      writeLast(now);
    };

    const check = () => {
      if (signingOut) return;
      if (Date.now() - readLast() < IDLE_LIMIT_MS) return;
      signingOut = true;
      void signOut()
        .catch(() => {})
        .finally(() => {
          window.location.replace("/login?blocked=idle");
        });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [enabled, signOut]);
}
