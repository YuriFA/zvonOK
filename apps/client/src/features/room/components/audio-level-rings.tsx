import { useMemo } from "react";

import { cn } from "@/lib/utils";

const THRESHOLD = 0.01;

interface AudioLevelRingsProps {
  level: number;
  color: string;
  maxRings?: number;
  className?: string;
}

export function AudioLevelRings({ level, color, maxRings = 4, className }: AudioLevelRingsProps) {
  const rings = useMemo(() => {
    if (level < THRESHOLD) {
      return [];
    }

    const fromWidth = 64;
    const result: { size: number; opacity: number }[] = [];

    for (let i = 0; i < maxRings; i++) {
      const opacity = Math.max(0, 1 - i / maxRings - (1 - level));
      const size = fromWidth + (i + 1) * 20;

      result.push({ size, opacity });
    }

    return result;
  }, [level, maxRings]);

  if (rings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center",
        className,
      )}
    >
      {rings.map((ring, i) => {
        return (
          <div
            key={i}
            className="absolute rounded-full transition-[opacity] duration-150 will-change-[opacity]"
            style={{
              width: ring.size,
              height: ring.size,
              backgroundColor: color,
              opacity: ring.opacity,
            }}
          />
        );
      })}
    </div>
  );
}
