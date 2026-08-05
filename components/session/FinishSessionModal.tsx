"use client";

import { useEffect, useState } from "react";

import { SessionNotesPanel } from "@/components/notes/SessionNotesPanel";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { Sparkle } from "@/components/ui/Sparkle";
import { fetchTopic } from "@/lib/catalog";
import { addDays, getStudyDayKey } from "@/lib/date";
import { emptyNotes, type SessionNotes } from "@/lib/notes-storage";

type FinishPayload = {
  percent: number;
  learned: string;
  remaining: string;
  notes: SessionNotes;
};

type FinishSessionModalProps = {
  open: boolean;
  topicId?: string | null;
  onCancel: () => void;
  onSave: (payload: FinishPayload) => void;
};

function priorLabel(lastStudiedAt: string | null, percent: number): string {
  if (percent <= 0) return "";
  if (!lastStudiedAt) {
    return `This topic was previously marked at ${percent}%.`;
  }
  const today = getStudyDayKey();
  const yesterday = addDays(today, -1);
  if (lastStudiedAt === yesterday) {
    return `This topic was ${percent}% finished yesterday.`;
  }
  if (lastStudiedAt === today) {
    return `This topic is already at ${percent}% from earlier today.`;
  }
  return `This topic was ${percent}% finished on ${lastStudiedAt}.`;
}

export function FinishSessionModal({
  open,
  topicId,
  onCancel,
  onSave,
}: FinishSessionModalProps) {
  const [percent, setPercent] = useState(50);
  const [priorPercent, setPriorPercent] = useState(0);
  const [priorMessage, setPriorMessage] = useState<string | null>(null);
  const [learned, setLearned] = useState("");
  const [remaining, setRemaining] = useState("");
  const [notes, setNotes] = useState<SessionNotes>(emptyNotes());
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLearned("");
    setRemaining("");
    setNotes(emptyNotes());
    setSparkle(false);
    setPriorPercent(0);
    setPriorMessage(null);
    setPercent(50);

    let cancelled = false;
    async function loadPrior() {
      if (!topicId) return;
      try {
        const topic = await fetchTopic(topicId);
        if (cancelled || !topic) return;
        const prior = Math.round(topic.completionPercent);
        setPriorPercent(prior);
        if (prior > 0) {
          setPriorMessage(priorLabel(topic.lastStudiedAt, prior));
          setPercent(Math.min(100, Math.max(prior, 1)));
        }
      } catch {
        /* keep defaults */
      }
    }
    void loadPrior();
    return () => {
      cancelled = true;
    };
  }, [open, topicId]);

  const belowPrior = priorPercent > 0 && percent < priorPercent;
  const atComplete = percent >= 100;
  const percentColor = belowPrior
    ? "text-rose-600"
    : "text-pastel-green-deep";
  const sliderAccent = belowPrior
    ? "accent-rose-500"
    : "accent-[var(--pastel-green-deep)]";

  return (
    <Modal
      open={open}
      title="How did this topic go?"
      onClose={onCancel}
      footer={
        <Button
          className="w-full"
          onClick={() => {
            setSparkle(true);
            onSave({ percent, learned, remaining, notes });
          }}
        >
          Save session <Sparkle show={sparkle} />
        </Button>
      }
    >
      <p className="text-caption">
        How much of this topic is completed overall?
      </p>

      {priorMessage ? (
        <p className="mt-3 rounded-[16px] border border-border-soft bg-ivory/80 px-3 py-2 text-sm text-charcoal">
          {priorMessage}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">1%</span>
          <span className={`font-display text-2xl font-semibold ${percentColor}`}>
            {percent}%
          </span>
          <span className="text-sm text-muted">100%</span>
        </div>
        {priorPercent > 0 ? (
          <div className="relative mt-1 h-3">
            <div
              className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-charcoal/35"
              style={{ left: `${priorPercent}%` }}
              title={`Previous mark ${priorPercent}%`}
            />
            <p
              className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-muted"
              style={{ left: `${priorPercent}%` }}
            >
              was {priorPercent}%
            </p>
          </div>
        ) : null}
        <input
          type="range"
          min={1}
          max={100}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className={`mt-2 w-full ${sliderAccent}`}
          aria-label="Completion percent"
        />
        <p
          className={`mt-2 text-caption ${
            belowPrior ? "text-rose-600" : "text-muted"
          }`}
        >
          {belowPrior
            ? `Below your previous ${priorPercent}% mark — only go lower if you truly need to.`
            : atComplete
              ? "Marked complete — lovely work finishing this topic."
              : priorPercent > 0
                ? `Stay at or above ${priorPercent}% as you progress. Mark 100% when the topic is fully done.`
                : "Mark 100% when this topic is fully complete."}
        </p>
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
    </Modal>
  );
}
