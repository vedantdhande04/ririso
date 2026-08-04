/** Soft day-complete celebration — pastel petals, not fireworks. */

export type ConfettiOptions = {
  particleCount?: number;
};

export function celebrateDayComplete(options: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ririso:day-complete", {
      detail: { particleCount: options.particleCount ?? 28 },
    }),
  );
}
