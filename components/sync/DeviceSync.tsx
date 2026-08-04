"use client";

import { useEffect, useRef } from "react";

import {
  pullRemoteState,
  schedulePushLocalState,
  syncEvents,
} from "@/lib/device-sync";

/**
 * Keeps Riya's study state shared across devices via Supabase (no login).
 * Pulls on mount / focus; pushes shortly after local writes.
 */
export function DeviceSync() {
  const booted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (cancelled) return;
      await pullRemoteState();
      booted.current = true;
    }

    void boot();

    function onLocalChanged() {
      if (!booted.current) return;
      schedulePushLocalState();
    }

    function onFocus() {
      void pullRemoteState();
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onFocus();
    }

    window.addEventListener(syncEvents.localChanged, onLocalChanged);
    window.addEventListener("ririso:sessions-changed", onLocalChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void pullRemoteState();
    }, 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener(syncEvents.localChanged, onLocalChanged);
      window.removeEventListener("ririso:sessions-changed", onLocalChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
