"use client";

type ShiftPickerProps = {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (value: string | null) => void;
};

export function ShiftPicker({
  label,
  options,
  value,
  onChange,
}: ShiftPickerProps) {
  return (
    <section className="animate-card-enter">
      <h3 className="font-display text-base font-semibold text-charcoal md:text-lg">
        {label}
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option)}
              className={`touch-target rounded-[var(--radius-button)] px-4 py-3 text-left text-sm font-semibold transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                selected
                  ? "border-2 border-pastel-green-deep bg-pastel-green/50 text-charcoal"
                  : "border border-border-soft bg-warm-white text-charcoal hover:bg-ivory"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}
