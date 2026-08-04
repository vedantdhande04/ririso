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

export default function CommitPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlanLocal | null>(null);
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

  function pledgeAndStart() {
    if (!plan) return;
    const next: DailyPlanLocal = {
      ...plan,
      status: "pledged",
      pledgedAt: new Date().toISOString(),
    };
    saveTodayPlan(next);
    resetQueueFromPlan();
    void ensureSameDayRevision();
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
        <Button className="mt-8 w-full text-base md:text-lg" onClick={pledgeAndStart}>
          {pledge}
        </Button>
      </Card>
    </PageShell>
  );
}
