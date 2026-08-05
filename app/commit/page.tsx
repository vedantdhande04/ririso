"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Doodle } from "@/components/doodles/Doodle";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { pledgeVariants, supportive } from "@/lib/copy";
import {
  countActiveShifts,
  loadTodayPlan,
  saveTodayPlan,
  type DailyPlanLocal,
} from "@/lib/planning-storage";
import { resetQueueFromPlan } from "@/lib/session-storage";
import { ensureSameDayRevision } from "@/lib/revision-storage";
import { syncAfterCommit } from "@/components/sync/SyncProvider";

export default function CommitPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlanLocal | null>(null);
  const [saving, setSaving] = useState(false);
  const pledge = useMemo(
    () => pledgeVariants[Math.floor(Math.random() * pledgeVariants.length)],
    [],
  );

  useEffect(() => {
    const today = loadTodayPlan();
    setPlan(today);
    if (countActiveShifts(today) === 0) {
      router.replace("/");
    }
  }, [router]);

  async function pledgeAndStart() {
    if (!plan || saving) return;
    setSaving(true);
    const next: DailyPlanLocal = {
      ...plan,
      status: "pledged",
      pledgedAt: new Date().toISOString(),
    };
    saveTodayPlan(next);
    resetQueueFromPlan();
    await ensureSameDayRevision();
    await syncAfterCommit();
    router.push("/");
  }

  if (!plan) return null;

  return (
    <PageShell className="flex flex-1 flex-col items-center justify-center text-center">
      <Card
        className="w-full max-w-lg"
        doodle={<Doodle name="star" size={32} />}
      >
        <p className="text-caption">Daily commitment</p>
        <h1 className="text-greeting mt-3">A quiet promise</h1>
        <p className="text-quote mt-4">{supportive.readyFirst}</p>
        <Button
          className="mt-8 w-full text-base md:text-lg"
          disabled={saving}
          onClick={() => void pledgeAndStart()}
        >
          {saving ? "Saving to cloud…" : pledge}
        </Button>
      </Card>
    </PageShell>
  );
}
