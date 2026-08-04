import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "touch-target w-full rounded-[var(--radius-input)] border border-border-soft bg-warm-white px-4 py-3 text-sm text-charcoal placeholder:text-soft outline-none transition focus:border-pastel-green-deep focus:ring-2 focus:ring-pastel-green/40";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function Textarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${fieldClass} min-h-24 resize-y ${className}`}
      {...props}
    />
  );
}
