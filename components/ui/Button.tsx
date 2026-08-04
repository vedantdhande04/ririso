"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useState } from "react";

type Variant = "primary" | "secondary" | "ghost" | "selected";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-pastel-pink text-charcoal hover:bg-pastel-pink-deep/40 border border-transparent",
  secondary:
    "bg-warm-white text-charcoal border border-border-soft hover:bg-ivory",
  ghost: "bg-transparent text-muted hover:bg-ivory border border-transparent",
  selected:
    "bg-pastel-green/50 text-charcoal border-2 border-pastel-green-deep",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  ...props
}: ButtonProps) {
  const [bounce, setBounce] = useState(false);

  return (
    <button
      type="button"
      className={`touch-target inline-flex items-center justify-center rounded-[var(--radius-button)] px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${variants[variant]} ${bounce ? "animate-soft-bounce" : ""} ${className}`}
      onClick={(e) => {
        setBounce(true);
        window.setTimeout(() => setBounce(false), 220);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
