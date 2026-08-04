"use client";

import { Textarea } from "@/components/ui/Input";
import type { SessionNotes } from "@/lib/notes-storage";

type SessionNotesPanelProps = {
  value: SessionNotes;
  onChange: (next: SessionNotes) => void;
  compact?: boolean;
};

const fields: Array<{ key: keyof SessionNotes; label: string; placeholder: string }> = [
  { key: "quick", label: "Quick notes", placeholder: "Anything useful…" },
  { key: "doubt", label: "Doubts", placeholder: "What feels unclear?" },
  { key: "fact", label: "Important facts", placeholder: "Keep these close…" },
  { key: "mistake", label: "Mistakes", placeholder: "Gentle reminders…" },
];

export function SessionNotesPanel({
  value,
  onChange,
  compact = false,
}: SessionNotesPanelProps) {
  return (
    <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
      {fields.map(({ key, label, placeholder }) => (
        <label key={key} className="block text-left text-sm font-medium text-charcoal">
          {label}
          <Textarea
            className="mt-1.5 min-h-20"
            value={value[key]}
            placeholder={placeholder}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
