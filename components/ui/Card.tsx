import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  doodle?: ReactNode;
};

export function Card({ children, className = "", doodle }: CardProps) {
  return (
    <div
      className={`relative animate-card-enter rounded-[var(--radius-card)] border border-border-soft bg-paper p-5 shadow-soft md:p-6 ${className}`}
    >
      {doodle ? (
        <div className="pointer-events-none absolute right-3 top-3 opacity-70">
          {doodle}
        </div>
      ) : null}
      {children}
    </div>
  );
}
