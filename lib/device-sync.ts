import { createBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";

/** localStorage keys that sync across devices (analytics cache stays local). */
export const SYNC_STORAGE_KEYS = [
  "ririso:daily-plan",
  "ririso:sessions",
  "ririso:session-history",
  "ririso:notes",
  "ririso:revisions",
  "ririso:calendar-events",
] as const;

const META_KEY = "ririso:sync-meta";
const LOCAL_CHANGED = "ririso:local-changed";
const SYNC_APPLIED = "ririso:sync-applied";

export type SyncPayload = Partial<Record<(typeof SYNC_STORAGE_KEYS)[number], string | null>>;

type SyncMeta = {
  updatedAt: string;
  deviceId: string;
};

let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | number | null = null;
let cachedUserId: string | null = null;

function deviceId(): string {
  if (typeof window === "undefined") return "server";
  const key = "ririso:device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function readMeta(): SyncMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function writeMeta(updatedAt: string) {
  if (typeof window === "undefined") return;
  const meta: SyncMeta = { updatedAt, deviceId: deviceId() };
  window.localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function collectLocalPayload(): SyncPayload {
  const payload: SyncPayload = {};
  if (typeof window === "undefined") return payload;
  for (const key of SYNC_STORAGE_KEYS) {
    payload[key] = window.localStorage.getItem(key);
  }
  return payload;
}

function localHasData(payload: SyncPayload): boolean {
  return SYNC_STORAGE_KEYS.some((key) => {
    const value = payload[key];
    return Boolean(value && value !== "null" && value !== "[]" && value !== "{}");
  });
}

function applyPayload(payload: SyncPayload) {
  if (typeof window === "undefined") return;
  applyingRemote = true;
  try {
    for (const key of SYNC_STORAGE_KEYS) {
      const value = payload[key];
      if (value == null || value === "") {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    }
    window.dispatchEvent(new Event(SYNC_APPLIED));
    window.dispatchEvent(new Event("ririso:sessions-changed"));
    try {
      // Soft-refresh analytics after remote apply
      window.localStorage.removeItem("ririso:analytics-cache");
    } catch {
      /* ignore */
    }
  } finally {
    // Allow listeners to settle before re-enabling push
    window.setTimeout(() => {
      applyingRemote = false;
    }, 0);
  }
}

export function notifyLocalDataChanged() {
  if (typeof window === "undefined" || applyingRemote) return;
  window.dispatchEvent(new Event(LOCAL_CHANGED));
}

export async function resolveUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  try {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("name", "Riya")
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    cachedUserId = data.id;
    return cachedUserId;
  } catch {
    return null;
  }
}

async function fetchRemote(userId: string) {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("app_sync_state")
    .select("payload, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { payload: SyncPayload; updated_at: string } | null;
}

async function upsertRemote(userId: string, payload: SyncPayload, updatedAt: string) {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("app_sync_state").upsert(
    {
      user_id: userId,
      payload: payload as Json,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/** Pull cloud state and merge with local (newer updatedAt wins). */
export async function pullRemoteState(): Promise<"applied" | "pushed" | "noop" | "skipped"> {
  if (typeof window === "undefined") return "skipped";
  const userId = await resolveUserId();
  if (!userId) return "skipped";

  try {
    const remote = await fetchRemote(userId);
    const localPayload = collectLocalPayload();
    const meta = readMeta();
    const localUpdated = meta?.updatedAt ?? null;

    if (!remote) {
      if (localHasData(localPayload)) {
        const now = new Date().toISOString();
        await upsertRemote(userId, localPayload, now);
        writeMeta(now);
        return "pushed";
      }
      return "noop";
    }

    const remotePayload = (remote.payload ?? {}) as SyncPayload;
    const remoteUpdated = remote.updated_at;

    if (!localHasData(localPayload) && localHasData(remotePayload)) {
      applyPayload(remotePayload);
      writeMeta(remoteUpdated);
      return "applied";
    }

    if (!localUpdated || remoteUpdated > localUpdated) {
      applyPayload(remotePayload);
      writeMeta(remoteUpdated);
      return "applied";
    }

    if (localUpdated > remoteUpdated) {
      await upsertRemote(userId, localPayload, localUpdated);
      return "pushed";
    }

    return "noop";
  } catch (err) {
    console.warn("Device sync pull failed", err);
    return "skipped";
  }
}

/** Push current localStorage snapshot to Supabase. */
export async function pushLocalState(): Promise<boolean> {
  if (typeof window === "undefined" || applyingRemote) return false;
  const userId = await resolveUserId();
  if (!userId) return false;

  try {
    const payload = collectLocalPayload();
    const now = new Date().toISOString();
    await upsertRemote(userId, payload, now);
    writeMeta(now);
    return true;
  } catch (err) {
    console.warn("Device sync push failed", err);
    return false;
  }
}

export function schedulePushLocalState(delayMs = 700) {
  if (typeof window === "undefined" || applyingRemote) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushLocalState();
  }, delayMs);
}

export const syncEvents = {
  localChanged: LOCAL_CHANGED,
  syncApplied: SYNC_APPLIED,
} as const;
