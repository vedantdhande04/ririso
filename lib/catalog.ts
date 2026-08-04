import { createBrowserClient } from "@/lib/supabase/client";
import type { ShiftSlot, TopicStatus } from "@/lib/supabase/types";

export type CatalogTopic = {
  id: string;
  name: string;
  completionPercent: number;
  status: TopicStatus;
  lastStudiedAt: string | null;
};

export type CatalogSubject = {
  id: string;
  name: string;
  shift: ShiftSlot;
  topics: CatalogTopic[];
};

function mapTopic(row: {
  id: string;
  name: string;
  completion_percent: number;
  status: TopicStatus;
  last_studied_at: string | null;
}): CatalogTopic {
  return {
    id: row.id,
    name: row.name,
    completionPercent: Number(row.completion_percent),
    status: row.status,
    lastStudiedAt: row.last_studied_at
      ? row.last_studied_at.slice(0, 10)
      : null,
  };
}

export function sortTopics(topics: CatalogTopic[]): CatalogTopic[] {
  const rank = (t: CatalogTopic) => {
    if (t.lastStudiedAt && t.status !== "completed") return 0;
    if (t.status !== "completed") return 1;
    return 2;
  };

  return [...topics].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (a.lastStudiedAt && b.lastStudiedAt) {
      return b.lastStudiedAt.localeCompare(a.lastStudiedAt);
    }
    if (a.lastStudiedAt) return -1;
    if (b.lastStudiedAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function fetchCatalog(): Promise<CatalogSubject[]> {
  const supabase = createBrowserClient();

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, shift_slot, sort_order")
    .order("sort_order", { ascending: true });

  if (subjectsError) throw subjectsError;

  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select(
      "id, subject_id, name, completion_percent, status, last_studied_at",
    );

  if (topicsError) throw topicsError;

  const bySubject = new Map<string, CatalogTopic[]>();
  for (const row of topics ?? []) {
    const list = bySubject.get(row.subject_id) ?? [];
    list.push(mapTopic(row));
    bySubject.set(row.subject_id, list);
  }

  return (subjects ?? []).map((subject) => ({
    id: subject.id,
    name: subject.name,
    shift: subject.shift_slot,
    topics: sortTopics(bySubject.get(subject.id) ?? []),
  }));
}

export async function createTopic(
  subjectId: string,
  name: string,
): Promise<CatalogTopic> {
  const supabase = createBrowserClient();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Topic name is required");

  const { data, error } = await supabase
    .from("topics")
    .insert({
      subject_id: subjectId,
      name: trimmed,
      completion_percent: 0,
      status: "not_started",
    })
    .select("id, name, completion_percent, status, last_studied_at")
    .single();

  if (error) throw error;
  return mapTopic(data);
}

export async function updateTopicProgress(
  topicId: string,
  completionPercent: number,
): Promise<CatalogTopic> {
  const supabase = createBrowserClient();
  const clamped = Math.min(100, Math.max(0, completionPercent));
  const status: TopicStatus =
    clamped >= 100 ? "completed" : clamped > 0 ? "in_progress" : "not_started";

  const { data, error } = await supabase
    .from("topics")
    .update({
      completion_percent: clamped,
      status,
      last_studied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", topicId)
    .select("id, name, completion_percent, status, last_studied_at")
    .single();

  if (error) throw error;
  return mapTopic(data);
}

export function subjectsForShift(
  catalog: CatalogSubject[],
  shift: ShiftSlot,
): CatalogSubject[] {
  return catalog.filter((s) => s.shift === shift);
}
