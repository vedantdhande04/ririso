import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Centers content on laptop with a comfortable max width.
 * Touch-friendly padding; prevents horizontal overflow.
 */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div
      className={`mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:max-w-5xl md:px-8 md:py-8 lg:max-w-6xl ${className}`}
    >
      {children}
    </div>
  );
}
