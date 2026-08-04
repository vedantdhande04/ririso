import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  illustration?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  illustration,
  action,
}: EmptyStateProps) {
  return (
    <div className="animate-card-enter flex flex-col items-center px-4 py-10 text-center">
      {illustration ? <div className="mb-4">{illustration}</div> : null}
      <h3 className="font-display text-lg font-semibold text-charcoal">
        {title}
      </h3>
      {description ? (
        <p className="text-quote mt-2 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
