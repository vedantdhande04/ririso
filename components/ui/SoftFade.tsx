import type { ReactNode } from "react";

type SoftFadeProps = {
  children?: ReactNode;
  className?: string;
};

/** Soft placeholder instead of spinning loaders. */
export function SoftFade({ children, className = "" }: SoftFadeProps) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-card)] bg-ivory/80 ${className}`}
      aria-busy="true"
      aria-live="polite"
    >
      {children ?? <div className="h-24 w-full" />}
    </div>
  );
}
