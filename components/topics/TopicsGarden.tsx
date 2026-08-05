"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CapsuleProgress } from "@/components/ui/CapsuleProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { SoftFade } from "@/components/ui/SoftFade";
import {
  fetchCatalog,
  renameTopic,
  type CatalogSubject,
} from "@/lib/catalog";
import { supportive } from "@/lib/copy";
import { loadTodayPlan, saveTodayPlan } from "@/lib/planning-storage";

export function TopicsGarden() {
  const [catalog, setCatalog] = useState<CatalogSubject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load topics");
        setCatalog([]);
      });
  }, []);

  async function saveRename() {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("Give this topic a name");
      return;
    }
    setEditError(null);
    setRenaming(true);
    try {
      const updated = await renameTopic(editingId, trimmed);
      setCatalog((prev) =>
        prev
          ? prev.map((subject) => ({
              ...subject,
              topics: subject.topics.map((t) =>
                t.id === editingId ? { ...t, name: updated.name } : t,
              ),
            }))
          : prev,
      );

      const plan = loadTodayPlan();
      let planChanged = false;
      const shifts = { ...plan.shifts };
      for (const key of Object.keys(shifts) as Array<keyof typeof shifts>) {
        if (shifts[key].topicId === editingId) {
          shifts[key] = { ...shifts[key], topicName: updated.name };
          planChanged = true;
        }
      }
      if (planChanged) {
        saveTodayPlan({ ...plan, shifts });
      }

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

  if (catalog === null) {
    return (
      <PageShell>
        <SoftFade className="h-40" />
      </PageShell>
    );
  }

  const allTopics = catalog.flatMap((s) =>
    s.topics.map((t) => ({ ...t, subjectName: s.name })),
  );

  return (
    <PageShell>
      <header className="animate-card-enter">
        <p className="text-caption">Syllabus garden</p>
        <h1 className="text-greeting mt-1">Topics</h1>
        <p className="text-quote mt-2">
          Everything you plant while planning grows here.
        </p>
      </header>

      {error ? (
        <p className="text-caption mt-4 text-pastel-pink-deep">{error}</p>
      ) : null}

      {allTopics.length === 0 ? (
        <Card className="mt-6" doodle={<Doodle name="flower" size={36} />}>
          <EmptyState
            title={supportive.topicsEmpty}
            description="Open today’s plan, pick a subject, and tap New topic."
            illustration={<Doodle name="leaf" size={48} />}
          />
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {catalog
            .filter((s) => s.topics.length > 0)
            .map((subject) => (
              <Card key={subject.id}>
                <h2 className="font-display text-lg font-semibold text-charcoal">
                  {subject.name}
                </h2>
                <p className="text-caption capitalize">{subject.shift} shift</p>
                <ul className="mt-4 space-y-3">
                  {subject.topics.map((topic) => {
                    const isEditing = editingId === topic.id;

                    if (isEditing) {
                      return (
                        <li
                          key={topic.id}
                          className="rounded-[18px] border border-pastel-green-deep/40 bg-paper p-3"
                        >
                          <Input
                            autoFocus
                            value={editName}
                            disabled={renaming}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveRename();
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
                              onClick={() => void saveRename()}
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
                        </li>
                      );
                    }

                    return (
                      <li
                        key={topic.id}
                        className={`rounded-[18px] border border-border-soft bg-ivory/60 p-3 ${
                          topic.status === "completed"
                            ? "animate-slide-completed"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-semibold ${
                                topic.status === "completed"
                                  ? "text-pastel-green-deep"
                                  : "text-charcoal"
                              }`}
                            >
                              {topic.name}
                              {topic.status === "completed" ? " ✓" : ""}
                            </p>
                            <p className="text-caption mt-1">
                              {topic.lastStudiedAt
                                ? `Last studied ${topic.lastStudiedAt}`
                                : "Not studied yet"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="text-sm font-semibold text-charcoal">
                              {topic.completionPercent}%
                            </span>
                            <button
                              type="button"
                              aria-label={`Rename ${topic.name}`}
                              title="Rename topic"
                              onClick={() => {
                                setEditingId(topic.id);
                                setEditName(topic.name);
                                setEditError(null);
                              }}
                              className="touch-target flex items-center justify-center rounded-[14px] px-2 text-muted transition-colors hover:bg-paper hover:text-charcoal"
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <CapsuleProgress value={topic.completionPercent} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
        </div>
      )}
    </PageShell>
  );
}
