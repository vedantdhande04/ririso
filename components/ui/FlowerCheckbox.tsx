"use client";

import { useState } from "react";

type FlowerCheckboxProps = {
  checked?: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
};

export function FlowerCheckbox({
  checked = false,
  label,
  onChange,
}: FlowerCheckboxProps) {
  const [on, setOn] = useState(checked);

  function toggle() {
    const next = !on;
    setOn(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="touch-target flex w-full items-center gap-3 rounded-[18px] border border-border-soft bg-paper px-3 py-2.5 text-left transition-transform hover:scale-[1.01] active:scale-[0.99]"
      aria-pressed={on}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200 ${
          on
            ? "animate-bloom border-pastel-green-deep bg-pastel-green/70"
            : "border-border-soft bg-warm-white"
        }`}
        aria-hidden
      >
        {on ? "❀" : ""}
      </span>
      <span
        className={`text-sm font-medium ${on ? "text-pastel-green-deep line-through decoration-pastel-green/50" : "text-charcoal"}`}
      >
        {label}
      </span>
    </button>
  );
}
