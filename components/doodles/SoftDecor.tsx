"use client";

import { usePathname } from "next/navigation";

import { Doodle, type DoodleName } from "@/components/doodles/Doodle";

type Accent = {
  name: DoodleName;
  className: string;
  size: number;
};

/**
 * A few floating pastel doodles — calm accents, never clutter.
 * Placement shifts gently by route so pages feel related but not identical.
 */
export function SoftDecor() {
  const pathname = usePathname();

  const accents: Accent[] = (() => {
    if (pathname.startsWith("/session")) {
      return [
        { name: "spiral", size: 42, className: "left-2 top-8 -rotate-6 opacity-[0.34] sm:left-4" },
        { name: "dots", size: 34, className: "right-3 top-24 rotate-12 opacity-[0.28] sm:right-6" },
        { name: "sprout", size: 40, className: "bottom-28 left-3 rotate-3 opacity-[0.3] sm:bottom-24 sm:left-8" },
      ];
    }
    if (pathname.startsWith("/analytics")) {
      return [
        { name: "hash", size: 32, className: "right-4 top-10 rotate-6 opacity-[0.28]" },
        { name: "ring", size: 44, className: "left-2 bottom-36 -rotate-12 opacity-[0.26] sm:left-6" },
        { name: "spark", size: 36, className: "right-6 bottom-40 opacity-[0.3]" },
      ];
    }
    if (pathname.startsWith("/calendar")) {
      return [
        { name: "heart", size: 38, className: "right-3 top-12 rotate-12 opacity-[0.32]" },
        { name: "wave", size: 48, className: "left-2 bottom-32 opacity-[0.28] sm:left-5" },
        { name: "blob", size: 50, className: "right-4 bottom-44 -rotate-6 opacity-[0.24]" },
      ];
    }
    if (pathname.startsWith("/topics")) {
      return [
        { name: "flower", size: 40, className: "right-4 top-10 -rotate-6 opacity-[0.34]" },
        { name: "sprout", size: 42, className: "left-3 bottom-36 rotate-6 opacity-[0.3] sm:left-7" },
        { name: "dots", size: 30, className: "right-8 bottom-48 opacity-[0.26]" },
      ];
    }
    if (pathname.startsWith("/commit") || pathname.startsWith("/revision")) {
      return [
        { name: "star", size: 36, className: "right-5 top-14 rotate-12 opacity-[0.34]" },
        { name: "heart", size: 34, className: "left-4 bottom-36 -rotate-8 opacity-[0.28]" },
      ];
    }
    // Home + default
    return [
      { name: "blob", size: 54, className: "right-2 top-6 -rotate-6 opacity-[0.3] sm:right-5 sm:top-8" },
      { name: "heart", size: 36, className: "left-2 top-28 rotate-12 opacity-[0.28] sm:left-5" },
      { name: "wave", size: 50, className: "bottom-32 right-3 opacity-[0.26] sm:bottom-28 sm:right-8" },
      { name: "sprout", size: 38, className: "bottom-44 left-4 -rotate-3 opacity-[0.28] sm:left-8" },
    ];
  })();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {accents.map((accent, index) => (
        <div
          key={`${pathname}-${accent.name}-${index}`}
          className={`absolute ${accent.className}`}
        >
          <div
            className={
              index % 2 === 0
                ? "animate-soft-float"
                : "animate-soft-float-delayed"
            }
          >
            <Doodle name={accent.name} size={accent.size} />
          </div>
        </div>
      ))}
    </div>
  );
}
