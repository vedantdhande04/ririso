import { createBrowserClient } from "@/lib/supabase/client";
import { computeAnalytics, type AnalyticsSnapshot } from "@/lib/analytics";
import type { Json } from "@/lib/supabase/types";

const CACHE_KEY = "ririso:analytics-cache";

type CacheEnvelope = {
  computedAt: string;
  snapshot: AnalyticsSnapshot;
};

export function readAnalyticsCache(): AnalyticsSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function writeAnalyticsCache(snapshot: AnalyticsSnapshot) {
  if (typeof window === "undefined") return;
  const envelope: CacheEnvelope = {
    computedAt: snapshot.computedAt,
    snapshot,
  };
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  void syncAnalyticsCacheToSupabase(snapshot);
}

export function getAnalyticsSnapshot(force = false): AnalyticsSnapshot {
  if (!force) {
    const cached = readAnalyticsCache();
    if (cached) {
      const age = Date.now() - new Date(cached.computedAt).getTime();
      if (age < 60_000) return cached;
    }
  }
  const live = computeAnalytics(90);
  writeAnalyticsCache(live);
  return live;
}

export function invalidateAnalyticsCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CACHE_KEY);
}

async function syncAnalyticsCacheToSupabase(snapshot: AnalyticsSnapshot) {
  try {
    const supabase = createBrowserClient();
    const { data: existing } = await supabase
      .from("analytics_cache")
      .select("id")
      .eq("cache_key", "overview_v1")
      .maybeSingle();

    const payload = JSON.parse(JSON.stringify(snapshot)) as Json;

    if (existing?.id) {
      await supabase
        .from("analytics_cache")
        .update({ payload, computed_at: snapshot.computedAt })
        .eq("id", existing.id);
    } else {
      await supabase.from("analytics_cache").insert({
        cache_key: "overview_v1",
        payload,
        computed_at: snapshot.computedAt,
      });
    }
  } catch {
    // optional sync
  }
}
