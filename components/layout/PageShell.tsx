import type { ReactNode } from "react";

import { SoftDecor } from "@/components/doodles/SoftDecor";

type PageShellProps = {
  children: ReactNode;
  className?: string;
  /** Soft floating doodles (default on). */
  decor?: boolean;
};

/**
 * Centers content on laptop with a comfortable max width.
 * Touch-friendly padding; prevents horizontal overflow.
 */
export function PageShell({
  children,
  className = "",
  decor = true,
}: PageShellProps) {
  return (
    <div
      className={`relative mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:max-w-5xl md:px-8 md:py-8 lg:max-w-6xl ${className}`}
    >
      {decor ? <SoftDecor /> : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
