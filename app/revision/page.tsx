import { Suspense } from "react";

import { RevisionSession } from "@/components/session/RevisionSession";
import { PageShell } from "@/components/layout/PageShell";

export default function RevisionPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-caption">Opening revision…</p>
        </PageShell>
      }
    >
      <RevisionSession />
    </Suspense>
  );
}
