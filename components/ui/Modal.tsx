"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  title?: string;
  children: ReactNode;
  /** Sticky action row below the scroll area (always visible). */
  footer?: ReactNode;
  /** When true, backdrop click does nothing (mandatory planning). */
  locked?: boolean;
  onClose?: () => void;
};

export function Modal({
  open,
  title,
  children,
  footer,
  locked = false,
  onClose,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label={locked ? "Planning required" : "Close"}
        className="absolute inset-0 bg-charcoal/20 backdrop-blur-[2px]"
        onClick={() => {
          if (!locked) onClose?.();
        }}
      />
      {/*
        On mobile, lift the sheet above the bottom nav + home indicator so
        actions never sit under the tab bar.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-popup-in relative z-10 flex w-full flex-col overflow-hidden rounded-t-[var(--radius-popup)] border border-border-soft bg-paper shadow-soft mb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-h-[min(92vh,calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px)))] md:mb-0 md:max-h-[85vh] md:w-full md:max-w-xl md:rounded-[var(--radius-popup)]"
      >
        <div className="soft-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 md:px-8 md:py-8">
          {title ? (
            <h2 className="font-display text-xl font-semibold text-charcoal">
              {title}
            </h2>
          ) : null}
          <div className={title ? "mt-4" : undefined}>{children}</div>
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border-soft bg-paper px-6 py-4 md:px-8">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
