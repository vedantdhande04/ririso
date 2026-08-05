"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  flushLocalState,
  isSyncHydrated,
  markSyncHydrated,
  pullRemoteState,
  schedulePushLocalState,
  syncEvents,
} from "@/lib/device-sync";

type SyncContextValue = {
  hydrated: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue>({
  hydrated: false,
  error: null,
  refresh: async () => undefined,
});

export function useSync() {
  return useContext(SyncContext);
}

/**
 * Blocks the app until the first cloud pull finishes so every device
 * sees the same pledged day before PlanningGate / Session decide anything.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(isSyncHydrated());
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await pullRemoteState();
    if (result === "error") {
      setError(
        "Could not reach the study cloud. Check the connection, then retry.",
      );
    } else {
      setError(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const result = await pullRemoteState();
      if (cancelled) return;
      if (result === "error") {
        setError(
          "Could not reach the study cloud. You can retry — or continue offline with care.",
        );
      }
      markSyncHydrated();
      setHydrated(true);
    }

    void boot();

    function onLocalChanged() {
      schedulePushLocalState();
    }

    function onFocus() {
      if (!isSyncHydrated()) return;
      void pullRemoteState().then((result) => {
        if (result === "applied") {
          window.dispatchEvent(new Event(syncEvents.syncApplied));
        }
      });
    }

    function onVisibility() {
      if (document.visibilityState === "visible") onFocus();
    }

    window.addEventListener(syncEvents.localChanged, onLocalChanged);
    window.addEventListener("ririso:sessions-changed", onLocalChanged);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && isSyncHydrated()) {
        void pullRemoteState();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener(syncEvents.localChanged, onLocalChanged);
      window.removeEventListener("ririso:sessions-changed", onLocalChanged);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const value = useMemo(
    () => ({ hydrated, error, refresh }),
    [hydrated, error, refresh],
  );

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xl font-semibold text-charcoal">
          Softly syncing…
        </p>
        <p className="text-quote mt-3 max-w-sm">
          Fetching today&apos;s plan so every device stays in step.
        </p>
      </div>
    );
  }

  return (
    <SyncContext.Provider value={value}>
      {error ? (
        <div className="border-b border-border-soft bg-pastel-yellow/50 px-4 py-2 text-center">
          <p className="text-caption text-charcoal">
            {error}{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void refresh()}
            >
              Retry
            </button>
          </p>
        </div>
      ) : null}
      {children}
    </SyncContext.Provider>
  );
}

/** Flush cloud after pledge / rest so the other phone sees it immediately. */
export async function syncAfterCommit() {
  await flushLocalState();
}
