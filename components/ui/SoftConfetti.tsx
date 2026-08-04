"use client";

import { useEffect, useState } from "react";

type Petal = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
};

const COLORS = ["#F3CFD8", "#B8D8C0", "#F5E6B8", "#DDD0EF", "#C9E6D1"];

export function SoftConfetti() {
  const [petals, setPetals] = useState<Petal[]>([]);

  useEffect(() => {
    function onCelebrate(event: Event) {
      const detail = (event as CustomEvent<{ particleCount?: number }>).detail;
      const count = detail?.particleCount ?? 28;
      const next: Petal[] = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 1.6 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        size: 8 + Math.random() * 10,
        drift: -40 + Math.random() * 80,
      }));
      setPetals(next);
      window.setTimeout(() => setPetals([]), 3200);
    }

    window.addEventListener("ririso:day-complete", onCelebrate);
    return () => window.removeEventListener("ririso:day-complete", onCelebrate);
  }, []);

  if (petals.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {petals.map((p) => (
        <span
          key={p.id}
          className="ririso-petal absolute top-[-12px] rounded-full opacity-90"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.7,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
