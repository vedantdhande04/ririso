"use client";

import { useEffect, useState } from "react";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { CapsuleProgress } from "@/components/ui/CapsuleProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { SoftFade } from "@/components/ui/SoftFade";
import { fetchCatalog, type CatalogSubject } from "@/lib/catalog";
import { supportive } from "@/lib/copy";

export function TopicsGarden() {
  const [catalog, setCatalog] = useState<CatalogSubject[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load topics");
        setCatalog([]);
      });
  }, []);

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
                  {subject.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className={`rounded-[18px] border border-border-soft bg-ivory/60 p-3 ${
                        topic.status === "completed"
                          ? "animate-slide-completed"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
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
                        <span className="text-sm font-semibold text-charcoal">
                          {topic.completionPercent}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <CapsuleProgress value={topic.completionPercent} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
        </div>
      )}
    </PageShell>
  );
}
