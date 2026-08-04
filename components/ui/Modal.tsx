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
      {/* Outer clips to radius so the scrollbar never spills past rounded corners */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-popup-in relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[var(--radius-popup)] border border-border-soft bg-paper shadow-soft md:max-h-[85vh] md:w-full md:max-w-xl md:rounded-[var(--radius-popup)]"
      >
        <div className="soft-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-8">
          {title ? (
            <h2 className="font-display text-xl font-semibold text-charcoal">
              {title}
            </h2>
          ) : null}
          <div className={title ? "mt-4" : undefined}>{children}</div>
        </div>
      </div>
    </div>
  );
}
