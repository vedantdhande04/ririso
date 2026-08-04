"use client";

import { useEffect, useState } from "react";

type SparkleProps = {
  show: boolean;
};

export function Sparkle({ show }: SparkleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 280);
    return () => window.clearTimeout(id);
  }, [show]);

  if (!visible) return null;

  return (
    <span
      aria-hidden
      className="animate-sparkle pointer-events-none inline-block text-pastel-yellow-deep"
    >
      ✦
    </span>
  );
}
