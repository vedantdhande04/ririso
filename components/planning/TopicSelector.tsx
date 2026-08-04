"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sortTopics, type CatalogTopic } from "@/lib/catalog";

type TopicSelectorProps = {
  topics: CatalogTopic[];
  value: string | null;
  creating?: boolean;
  onChange: (topicId: string) => void;
  onCreate: (name: string) => Promise<void> | void;
};

function formatDate(value: string | null) {
  if (!value) return "Not studied yet";
  return `Last studied ${value}`;
}

export function TopicSelector({
  topics,
  value,
  creating = false,
  onChange,
  onCreate,
}: TopicSelectorProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ordered = sortTopics(topics);

  async function submitNewTopic() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this topic a name");
      return;
    }
    setError(null);
    try {
      await onCreate(trimmed);
      setName("");
      setAdding(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create topic";
      setError(message);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-[var(--radius-card)] border border-border-soft bg-ivory/50 p-3">
      <p className="text-caption">Choose a topic</p>
      <ul className="max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
        <li>
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="touch-target flex w-full items-center gap-2 rounded-[18px] border border-dashed border-pastel-pink-deep/50 bg-pastel-pink/30 px-3 py-3 text-left text-sm font-semibold text-charcoal transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Plus size={18} strokeWidth={2} />
              New topic
            </button>
          ) : (
            <div className="rounded-[18px] border border-pastel-pink-deep/40 bg-paper p-3">
              <Input
                autoFocus
                placeholder="Topic name"
                value={name}
                disabled={creating}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitNewTopic();
                  }
                  if (e.key === "Escape") {
                    setAdding(false);
                    setName("");
                    setError(null);
                  }
                }}
              />
              {error ? (
                <p className="text-caption mt-2 text-pastel-pink-deep">{error}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Button
                  className="flex-1"
                  disabled={creating}
                  onClick={() => void submitNewTopic()}
                >
                  {creating ? "Saving…" : "Add topic"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={creating}
                  onClick={() => {
                    setAdding(false);
                    setName("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </li>

        {ordered.length === 0 && !adding ? (
          <li>
            <p className="text-caption px-1 py-2">
              No topics yet — add the first one above.
            </p>
          </li>
        ) : null}

        {ordered.map((topic) => {
          const selected = value === topic.id;
          const done = topic.status === "completed";
          return (
            <li key={topic.id}>
              <button
                type="button"
                onClick={() => onChange(topic.id)}
                className={`touch-target flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition-transform hover:scale-[1.01] active:scale-[0.99] ${
                  selected
                    ? "border-2 border-pastel-green-deep bg-pastel-green/40"
                    : "border border-border-soft bg-paper"
                } ${done ? "text-pastel-green-deep" : "text-charcoal"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {topic.name}
                    {done ? " ✓" : ""}
                  </span>
                  <span className="text-caption">
                    {formatDate(topic.lastStudiedAt)}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold">
                  {topic.completionPercent}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
