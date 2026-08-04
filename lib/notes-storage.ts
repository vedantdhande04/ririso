import { createBrowserClient } from "@/lib/supabase/client";
import type { NoteType } from "@/lib/supabase/types";
import { getStudyDayKey } from "@/lib/date";

export type SessionNotes = {
  quick: string;
  doubt: string;
  fact: string;
  mistake: string;
};

export type StoredNote = {
  id: string;
  planDate: string;
  sessionId: string | null;
  topicId: string;
  topicName: string;
  noteType: NoteType;
  body: string;
  createdAt: string;
};

const KEY = "ririso:notes";

export const emptyNotes = (): SessionNotes => ({
  quick: "",
  doubt: "",
  fact: "",
  mistake: "",
});

function loadAll(): StoredNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredNote[]) : [];
  } catch {
    return [];
  }
}

export function loadAllNotes(): StoredNote[] {
  return loadAll();
}

function saveAll(notes: StoredNote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(notes));
}

export function notesForTopic(topicId: string): StoredNote[] {
  return loadAll().filter((n) => n.topicId === topicId);
}

export function notesForDate(planDate: string): StoredNote[] {
  return loadAll().filter((n) => n.planDate === planDate);
}

export function notesGroupedByTopic(planDate: string) {
  const groups = new Map<
    string,
    { topicId: string; topicName: string; notes: StoredNote[] }
  >();
  for (const note of notesForDate(planDate)) {
    const existing = groups.get(note.topicId);
    if (existing) {
      existing.notes.push(note);
    } else {
      groups.set(note.topicId, {
        topicId: note.topicId,
        topicName: note.topicName,
        notes: [note],
      });
    }
  }
  return [...groups.values()];
}

/** Persist typed notes locally + to Supabase. */
export async function saveSessionNotes(input: {
  sessionId: string;
  topicId: string;
  topicName: string;
  notes: SessionNotes;
  learned?: string;
  remaining?: string;
  planDate?: string;
}) {
  const planDate = input.planDate ?? getStudyDayKey();
  const entries: Array<{ noteType: NoteType; body: string }> = (
    [
      { noteType: "quick" as const, body: input.notes.quick },
      { noteType: "doubt" as const, body: input.notes.doubt },
      { noteType: "fact" as const, body: input.notes.fact },
      { noteType: "mistake" as const, body: input.notes.mistake },
      { noteType: "learned" as const, body: input.learned ?? "" },
      { noteType: "remaining" as const, body: input.remaining ?? "" },
    ] satisfies Array<{ noteType: NoteType; body: string }>
  ).filter((e) => e.body.trim().length > 0);

  const local: StoredNote[] = entries.map((e) => ({
    id: crypto.randomUUID(),
    planDate,
    sessionId: input.sessionId,
    topicId: input.topicId,
    topicName: input.topicName,
    noteType: e.noteType,
    body: e.body.trim(),
    createdAt: new Date().toISOString(),
  }));

  saveAll([...loadAll(), ...local]);

  if (entries.length === 0) return local;

  try {
    const supabase = createBrowserClient();
    const { error } = await supabase.from("notes").insert(
      entries.map((e) => ({
        session_id: null,
        topic_id: input.topicId,
        note_type: e.noteType,
        body: e.body.trim(),
      })),
    );
    if (error) console.warn("Supabase notes save failed", error.message);
  } catch (err) {
    console.warn("Supabase notes save failed", err);
  }

  return local;
}
