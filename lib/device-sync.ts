import { createBrowserClient } from "@/lib/supabase/client";
import { getStudyDayKey } from "@/lib/date";
import type { Json } from "@/lib/supabase/types";

/** localStorage keys that sync across devices (analytics cache stays device-local). */
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
const SYNC_HYDRATED = "ririso:sync-hydrated";

export type SyncPayload = Partial<
  Record<(typeof SYNC_STORAGE_KEYS)[number], string | null>
>;

type SyncMeta = {
  updatedAt: string;
  deviceId: string;
};

type PlanShape = {
  planDate?: string;
  pledgedAt?: string | null;
  status?: string;
};

type SessionsShape = {
  planDate?: string;
};

let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | number | null = null;
let cachedUserId: string | null = null;
let hydrated = false;

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

function clearMeta() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(META_KEY);
}

function collectLocalPayload(): SyncPayload {
  const payload: SyncPayload = {};
  if (typeof window === "undefined") return payload;
  for (const key of SYNC_STORAGE_KEYS) {
    payload[key] = window.localStorage.getItem(key);
  }
  return payload;
}

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function planFromPayload(payload: SyncPayload): PlanShape | null {
  return parseJson<PlanShape>(payload["ririso:daily-plan"] ?? null);
}

/** Today's plan counts only if pledged or explicitly rest. */
function isCommittedToday(plan: PlanShape | null): boolean {
  if (!plan) return false;
  if (plan.planDate !== getStudyDayKey()) return false;
  return Boolean(plan.pledgedAt) || plan.status === "rest" || plan.status === "pledged";
}

function localHasAnyData(payload: SyncPayload): boolean {
  return SYNC_STORAGE_KEYS.some((key) => {
    const value = payload[key];
    return Boolean(value && value !== "null" && value !== "[]" && value !== "{}");
  });
}

/** Drop stale day-scoped blobs so yesterday never pretends to be today. */
function sanitizeForToday(payload: SyncPayload): SyncPayload {
  const next: SyncPayload = { ...payload };
  const today = getStudyDayKey();

  const plan = planFromPayload(next);
  if (plan && plan.planDate && plan.planDate !== today) {
    next["ririso:daily-plan"] = null;
  }

  const sessions = parseJson<SessionsShape>(next["ririso:sessions"] ?? null);
  if (sessions?.planDate && sessions.planDate !== today) {
    next["ririso:sessions"] = null;
  }

  return next;
}

function emptyPayload(): SyncPayload {
  const payload: SyncPayload = {};
  for (const key of SYNC_STORAGE_KEYS) {
    payload[key] = null;
  }
  return payload;
}

type SessionMergeShape = {
  id: string;
  shift: string;
  topicId: string;
  isExtra?: boolean;
  status: string;
  startedAt: string | null;
  endedAt?: string | null;
  accumulatedStudyMs: number;
  pauseMs: number;
  pauseCount: number;
  pauses: Array<{ startedAt: string; endedAt: string | null }>;
  activePauseStartedAt: string | null;
  notesLearned?: string;
  notesRemaining?: string;
  notesQuick?: string;
  notesDoubt?: string;
  notesFact?: string;
  notesMistake?: string;
  completionPercent?: number | null;
};

type DaySessionsMerge = {
  planDate: string;
  sessions: SessionMergeShape[];
};

function sessionIdentity(s: SessionMergeShape): string {
  if (s.isExtra) return `extra:${s.id}`;
  return `${s.shift}:${s.topicId}`;
}

function statusRank(status: string): number {
  if (status === "completed") return 5;
  if (status === "skipped") return 4;
  if (status === "active") return 3;
  if (status === "paused") return 2;
  return 0;
}

/** When the last play/pause/finish action happened (not live tick time). */
function stateChangedAt(s: SessionMergeShape): number {
  if (s.status === "paused" && s.activePauseStartedAt) {
    return new Date(s.activePauseStartedAt).getTime();
  }
  if (s.status === "active") {
    const lastEnded = [...(s.pauses ?? [])].reverse().find((p) => p.endedAt);
    if (lastEnded?.endedAt) return new Date(lastEnded.endedAt).getTime();
    if (s.startedAt) return new Date(s.startedAt).getTime();
  }
  if (
    (s.status === "completed" || s.status === "skipped") &&
    s.endedAt
  ) {
    return new Date(s.endedAt).getTime();
  }
  return 0;
}

/**
 * Prefer the latest control action (pause/resume/finish).
 * Never let a still-ticking "active" copy beat a newer pause just because
 * its live elapsed seconds grew on screen.
 */
function pickBetterSession(
  a: SessionMergeShape,
  b: SessionMergeShape,
): SessionMergeShape {
  const ra = statusRank(a.status);
  const rb = statusRank(b.status);
  if (ra === 0 && rb > 0) return b;
  if (rb === 0 && ra > 0) return a;

  if (ra >= 4 || rb >= 4) {
    if (ra !== rb) return ra > rb ? a : b;
    return stateChangedAt(a) >= stateChangedAt(b) ? a : b;
  }

  const aRun = a.status === "active" || a.status === "paused";
  const bRun = b.status === "active" || b.status === "paused";
  if (aRun && bRun) {
    if (a.status !== b.status) {
      return stateChangedAt(a) >= stateChangedAt(b) ? a : b;
    }

    if (a.status === "paused" && b.status === "paused") {
      if (a.accumulatedStudyMs !== b.accumulatedStudyMs) {
        return a.accumulatedStudyMs > b.accumulatedStudyMs ? a : b;
      }
      return stateChangedAt(a) >= stateChangedAt(b) ? a : b;
    }

    // both active — richer history / banked time, then earlier start
    if (a.pauseCount !== b.pauseCount) {
      return a.pauseCount > b.pauseCount ? a : b;
    }
    if (a.accumulatedStudyMs !== b.accumulatedStudyMs) {
      return a.accumulatedStudyMs > b.accumulatedStudyMs ? a : b;
    }
    const aStart = a.startedAt
      ? new Date(a.startedAt).getTime()
      : Number.POSITIVE_INFINITY;
    const bStart = b.startedAt
      ? new Date(b.startedAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (aStart !== bStart) return aStart < bStart ? a : b;
    return stateChangedAt(a) >= stateChangedAt(b) ? a : b;
  }

  if (ra !== rb) return ra > rb ? a : b;

  const noteLen = (s: SessionMergeShape) =>
    [
      s.notesLearned,
      s.notesRemaining,
      s.notesQuick,
      s.notesDoubt,
      s.notesFact,
      s.notesMistake,
    ]
      .join("")
      .length;
  if (noteLen(a) !== noteLen(b)) return noteLen(a) > noteLen(b) ? a : b;

  return a.pauseCount >= b.pauseCount ? a : b;
}

function mergeSessionsJson(
  leftRaw: string | null | undefined,
  rightRaw: string | null | undefined,
): string | null {
  const left = parseJson<DaySessionsMerge>(leftRaw ?? null);
  const right = parseJson<DaySessionsMerge>(rightRaw ?? null);
  if (!left && !right) return null;
  if (!left) return rightRaw ?? null;
  if (!right) return leftRaw ?? null;

  const today = getStudyDayKey();
  if (left.planDate === today && right.planDate !== today) return leftRaw ?? null;
  if (right.planDate === today && left.planDate !== today) return rightRaw ?? null;

  const byKey = new Map<string, SessionMergeShape>();
  for (const session of left.sessions) {
    byKey.set(sessionIdentity(session), session);
  }
  for (const session of right.sessions) {
    const key = sessionIdentity(session);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickBetterSession(existing, session) : session);
  }

  const merged: DaySessionsMerge = {
    planDate: left.planDate === today || right.planDate !== today
      ? left.planDate
      : right.planDate,
    sessions: Array.from(byKey.values()),
  };
  return JSON.stringify(merged);
}

/** Newer blob wins for most keys; sessions always merge by progress. */
function mergeSyncPayloads(newer: SyncPayload, older: SyncPayload): SyncPayload {
  const out: SyncPayload = { ...older, ...newer };
  out["ririso:sessions"] = mergeSessionsJson(
    newer["ririso:sessions"],
    older["ririso:sessions"],
  );
  return out;
}

function applyPayload(payload: SyncPayload) {
  if (typeof window === "undefined") return;
  applyingRemote = true;
  try {
    const clean = sanitizeForToday(payload);
    for (const key of SYNC_STORAGE_KEYS) {
      const value = clean[key];
      if (value == null || value === "") {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    }
    window.dispatchEvent(new Event(SYNC_APPLIED));
    window.dispatchEvent(new Event("ririso:sessions-changed"));
    try {
      window.localStorage.removeItem("ririso:analytics-cache");
    } catch {
      /* ignore */
    }
  } finally {
    window.setTimeout(() => {
      applyingRemote = false;
    }, 0);
  }
}

/** Cloud wipe landed — clear synced keys so this device cannot reseed. */
function applyCloudWipe(remoteUpdatedAt: string) {
  applyPayload(emptyPayload());
  writeMeta(remoteUpdatedAt);
}

export function notifyLocalDataChanged() {
  if (typeof window === "undefined" || applyingRemote) return;
  window.dispatchEvent(new Event(LOCAL_CHANGED));
}

export function isSyncHydrated() {
  return hydrated;
}

export function markSyncHydrated() {
  hydrated = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_HYDRATED));
  }
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

async function upsertRemote(
  userId: string,
  payload: SyncPayload,
  updatedAt: string,
) {
  const supabase = createBrowserClient();
  const { error } = await supabase.from("app_sync_state").upsert(
    {
      user_id: userId,
      payload: sanitizeForToday(payload) as Json,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

/**
 * Cloud-first pull. Committed plans on the server always win over empty
 * local drafts so a fresh phone never overwrites laptop work.
 *
 * An empty cloud snapshot with a newer timestamp is a wipe — clear local
 * and never re-upload stale cache.
 */
export async function pullRemoteState(): Promise<
  "applied" | "pushed" | "noop" | "skipped" | "error"
> {
  if (typeof window === "undefined") return "skipped";
  const userId = await resolveUserId();
  if (!userId) return "skipped";

  try {
    const remote = await fetchRemote(userId);
    const localPayload = collectLocalPayload();
    const meta = readMeta();
    const localUpdated = meta?.updatedAt ?? null;
    const localPlan = planFromPayload(localPayload);
    const localCommitted = isCommittedToday(localPlan);

    if (!remote) {
      // Row deleted after this device had synced → wipe, do not reseed
      if (meta) {
        applyPayload(emptyPayload());
        clearMeta();
        return "applied";
      }
      // First-ever bootstrap from a committed local day
      if (localHasAnyData(localPayload) && localCommitted) {
        const now = new Date().toISOString();
        await upsertRemote(userId, localPayload, now);
        writeMeta(now);
        return "pushed";
      }
      return "noop";
    }

    const remotePayload = (remote.payload ?? {}) as SyncPayload;
    const remoteUpdated = remote.updated_at;
    const remotePlan = planFromPayload(remotePayload);
    const remoteCommitted = isCommittedToday(remotePlan);
    const remoteEmpty = !localHasAnyData(remotePayload);

    // Empty cloud newer than this device → wipe local (handover reset)
    if (remoteEmpty && (!localUpdated || remoteUpdated > localUpdated)) {
      applyCloudWipe(remoteUpdated);
      return "applied";
    }

    // Stale local clock trying to outrun an empty wipe
    if (remoteEmpty && localUpdated && localUpdated > remoteUpdated) {
      applyCloudWipe(remoteUpdated);
      return "applied";
    }

    // Empty / uncommitted phone must never clobber a pledged laptop day
    if (remoteCommitted && !localCommitted) {
      const merged = mergeSyncPayloads(remotePayload, localPayload);
      applyPayload(merged);
      writeMeta(remoteUpdated);
      if (merged["ririso:sessions"] !== remotePayload["ririso:sessions"]) {
        const now = new Date().toISOString();
        await upsertRemote(userId, merged, now);
        writeMeta(now);
      }
      return "applied";
    }

    if (!localHasAnyData(localPayload) && localHasAnyData(remotePayload)) {
      applyPayload(remotePayload);
      writeMeta(remoteUpdated);
      return "applied";
    }

    if (!localUpdated || remoteUpdated > localUpdated) {
      const merged = mergeSyncPayloads(remotePayload, localPayload);
      applyPayload(merged);
      if (merged["ririso:sessions"] !== remotePayload["ririso:sessions"]) {
        const now = new Date().toISOString();
        await upsertRemote(userId, merged, now);
        writeMeta(now);
      } else {
        writeMeta(remoteUpdated);
      }
      return "applied";
    }

    if (localUpdated > remoteUpdated) {
      if (localCommitted || !remoteCommitted) {
        const merged = mergeSyncPayloads(localPayload, remotePayload);
        applyPayload(merged);
        const now = new Date().toISOString();
        await upsertRemote(userId, merged, now);
        writeMeta(now);
        return "pushed";
      }
      const merged = mergeSyncPayloads(remotePayload, localPayload);
      applyPayload(merged);
      writeMeta(remoteUpdated);
      return "applied";
    }

    // Same timestamp — still merge sessions in case both moved
    {
      const merged = mergeSyncPayloads(localPayload, remotePayload);
      if (merged["ririso:sessions"] !== localPayload["ririso:sessions"]) {
        applyPayload(merged);
        const now = new Date().toISOString();
        await upsertRemote(userId, merged, now);
        writeMeta(now);
        return "applied";
      }
    }

    return "noop";
  } catch (err) {
    console.warn("Device sync pull failed", err);
    return "error";
  }
}

/** Push current localStorage snapshot to Supabase. */
export async function pushLocalState(): Promise<boolean> {
  if (typeof window === "undefined" || applyingRemote) return false;
  const userId = await resolveUserId();
  if (!userId) return false;

  try {
    const payload = collectLocalPayload();
    const localPlan = planFromPayload(payload);
    if (!isCommittedToday(localPlan) && !localHasAnyData(payload)) {
      return false;
    }

    const remote = await fetchRemote(userId);
    const meta = readMeta();

    if (remote) {
      const remotePayload = (remote.payload ?? {}) as SyncPayload;
      const remotePlan = planFromPayload(remotePayload);
      const remoteEmpty = !localHasAnyData(remotePayload);

      // Empty cloud = wipe marker. Only push over it after this device
      // has already absorbed that wipe (meta >= remote time). Otherwise
      // stale localStorage would undo the SQL reset.
      if (remoteEmpty) {
        if (meta && meta.updatedAt >= remote.updated_at) {
          // fall through — new plan after wipe
        } else {
          applyCloudWipe(remote.updated_at);
          return false;
        }
      } else if (isCommittedToday(remotePlan) && !isCommittedToday(localPlan)) {
        const merged = mergeSyncPayloads(
          remote.payload as SyncPayload,
          payload,
        );
        applyPayload(merged);
        writeMeta(remote.updated_at);
        return false;
      } else {
        // Always merge sessions before push so a pending PC cannot
        // overwrite an active phone timer (or vice versa).
        const remotePayload = remote.payload as SyncPayload;
        const merged = mergeSyncPayloads(payload, remotePayload);
        applyPayload(merged);
        const now = new Date().toISOString();
        await upsertRemote(userId, merged, now);
        writeMeta(now);
        return true;
      }
    } else if (meta) {
      // Sync row deleted after prior use — wipe local, don't recreate from cache
      applyPayload(emptyPayload());
      clearMeta();
      return false;
    }

    const now = new Date().toISOString();
    await upsertRemote(userId, payload, now);
    writeMeta(now);
    return true;
  } catch (err) {
    console.warn("Device sync push failed", err);
    return false;
  }
}

export function schedulePushLocalState(delayMs = 400) {
  if (typeof window === "undefined" || applyingRemote || !hydrated) return;
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void pushLocalState();
  }, delayMs);
}

/** Awaitable push used after pledge / important writes. */
export async function flushLocalState() {
  if (pushTimer) {
    window.clearTimeout(pushTimer);
    pushTimer = null;
  }
  return pushLocalState();
}

export const syncEvents = {
  localChanged: LOCAL_CHANGED,
  syncApplied: SYNC_APPLIED,
  syncHydrated: SYNC_HYDRATED,
} as const;
