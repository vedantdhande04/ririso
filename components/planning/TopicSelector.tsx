"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sortTopics, type CatalogTopic } from "@/lib/catalog";

type TopicSelectorProps = {
  topics: CatalogTopic[];
  value: string | null;
  creating?: boolean;
  onChange: (topicId: string | null) => void;
  onCreate: (name: string) => Promise<void> | void;
  onRename?: (topicId: string, name: string) => Promise<void> | void;
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
  onRename,
}: TopicSelectorProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
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

  async function submitRename() {
    if (!editingId || !onRename) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Give this topic a name");
      return;
    }
    setEditError(null);
    setRenaming(true);
    try {
      await onRename(editingId, trimmed);
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Could not rename topic",
      );
    } finally {
      setRenaming(false);
    }
  }

  function startEdit(topic: CatalogTopic) {
    setAdding(false);
    setEditingId(topic.id);
    setEditName(topic.name);
    setEditError(null);
  }

  return (
    <div className="mt-3 space-y-2 rounded-[var(--radius-card)] border border-border-soft bg-ivory/50 p-3">
      <p className="text-caption">Choose a topic</p>
      <ul className="soft-scroll max-h-64 space-y-2 overflow-y-auto overscroll-contain pr-1">
        <li>
          {!adding ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setAdding(true);
              }}
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
          const isEditing = editingId === topic.id;

          if (isEditing) {
            return (
              <li key={topic.id}>
                <div className="rounded-[18px] border border-pastel-green-deep/50 bg-paper p-3">
                  <Input
                    autoFocus
                    value={editName}
                    disabled={renaming}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submitRename();
                      }
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditName("");
                        setEditError(null);
                      }
                    }}
                  />
                  {editError ? (
                    <p className="text-caption mt-2 text-pastel-pink-deep">
                      {editError}
                    </p>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={renaming}
                      onClick={() => void submitRename()}
                    >
                      {renaming ? "Saving…" : "Save name"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={renaming}
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                        setEditError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={topic.id}>
              <div
                className={`flex w-full items-stretch gap-1 rounded-[18px] ${
                  selected
                    ? "border-2 border-pastel-green-deep bg-pastel-green/40"
                    : "border border-border-soft bg-paper"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(selected ? null : topic.id)}
                  className={`touch-target flex min-w-0 flex-1 items-center justify-between gap-3 px-3 py-3 text-left transition-transform hover:scale-[1.01] active:scale-[0.99] ${
                    done ? "text-pastel-green-deep" : "text-charcoal"
                  }`}
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
                {onRename ? (
                  <button
                    type="button"
                    aria-label={`Rename ${topic.name}`}
                    title="Rename topic"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(topic);
                    }}
                    className="touch-target my-1 mr-1 flex shrink-0 items-center justify-center rounded-[14px] px-2 text-muted transition-colors hover:bg-ivory hover:text-charcoal"
                  >
                    <Pencil size={16} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
