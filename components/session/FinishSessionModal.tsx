"use client";

import { useEffect, useState } from "react";

import { SessionNotesPanel } from "@/components/notes/SessionNotesPanel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { Sparkle } from "@/components/ui/Sparkle";
import { emptyNotes, type SessionNotes } from "@/lib/notes-storage";

type FinishPayload = {
  percent: number;
  learned: string;
  remaining: string;
  notes: SessionNotes;
};

type FinishSessionModalProps = {
  open: boolean;
  onCancel: () => void;
  onSave: (payload: FinishPayload) => void;
};

export function FinishSessionModal({
  open,
  onCancel,
  onSave,
}: FinishSessionModalProps) {
  const [percent, setPercent] = useState(50);
  const [learned, setLearned] = useState("");
  const [remaining, setRemaining] = useState("");
  const [notes, setNotes] = useState<SessionNotes>(emptyNotes());
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPercent(50);
    setLearned("");
    setRemaining("");
    setNotes(emptyNotes());
    setSparkle(false);
  }, [open]);

  return (
    <Modal open={open} title="How did this topic go?" onClose={onCancel}>
      <p className="text-caption">
        How much of today&apos;s topic was completed?
      </p>
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">1%</span>
          <span className="font-display text-2xl font-semibold text-pastel-green-deep">
            {percent}%
          </span>
          <span className="text-sm text-muted">100%</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--pastel-green-deep)]"
          aria-label="Completion percent"
        />
      </div>

      <label className="mt-5 block text-sm font-medium text-charcoal">
        What did you learn?
        <Textarea
          className="mt-2"
          value={learned}
          onChange={(e) => setLearned(e.target.value)}
          placeholder="A gentle note for future you…"
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-charcoal">
        What remains?
        <Textarea
          className="mt-2"
          value={remaining}
          onChange={(e) => setRemaining(e.target.value)}
          placeholder="Optional"
        />
      </label>

      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-charcoal">Session notes</p>
        <SessionNotesPanel value={notes} onChange={setNotes} compact />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button
          className="w-full"
          onClick={() => {
            setSparkle(true);
            onSave({ percent, learned, remaining, notes });
          }}
        >
          Save session <Sparkle show={sparkle} />
        </Button>
      </div>
    </Modal>
  );
}
