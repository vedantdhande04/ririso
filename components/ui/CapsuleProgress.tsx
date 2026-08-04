type CapsuleProgressProps = {
  value: number;
  segments?: number;
};

/** Soft growth-style progress using pastel capsules. */
export function CapsuleProgress({
  value,
  segments = 8,
}: CapsuleProgressProps) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * segments);

  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${value}% complete`}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-5 rounded-full transition-colors duration-300 ${
            i < filled ? "bg-pastel-green-deep" : "bg-border-soft"
          }`}
        />
      ))}
    </div>
  );
}
