type ProgressRingProps = {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
};

export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-soft)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--pastel-green-deep)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="animate-bloom transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-charcoal">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
