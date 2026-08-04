"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  /** When true, backdrop click does nothing (mandatory planning). */
  locked?: boolean;
  onClose?: () => void;
};

export function Modal({
  open,
  title,
  children,
  locked = false,
  onClose,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label={locked ? "Planning required" : "Close"}
        className="absolute inset-0 bg-charcoal/20 backdrop-blur-[2px]"
        onClick={() => {
          if (!locked) onClose?.();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-popup-in relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[var(--radius-popup)] border border-border-soft bg-paper p-6 shadow-soft md:max-h-[85vh] md:w-full md:max-w-xl md:rounded-[var(--radius-popup)] md:p-8"
      >
        {title ? (
          <h2 className="font-display text-xl font-semibold text-charcoal">
            {title}
          </h2>
        ) : null}
        <div className={title ? "mt-4" : undefined}>{children}</div>
      </div>
    </div>
  );
}
