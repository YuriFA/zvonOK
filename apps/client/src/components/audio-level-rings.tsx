import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelRingsProps {
  level: number;
  color: string;
  maxRings?: number;
  baseRadius?: number;
  className?: string;
}

export function AudioLevelRings({
  level,
  color,
  maxRings = 4,
  baseRadius = 32,
  className,
}: AudioLevelRingsProps) {
  const threshold = 0.01;

  const rings = useMemo(() => {
    if (level < threshold) return [];

    const count = Math.ceil(level * maxRings);
    const spacing = 10;
    const result: { size: number; opacity: number; radius: number; borderWidth: number }[] = [];

    for (let i = 0; i < count; i++) {
      const radius = baseRadius + (i + 1) * spacing * (1 + level * 0.5);
      const opacity = level * (1 - i / count);
      const borderWidth = 1 + level * 2;
      const size = radius * 2;

      result.push({ size, opacity, radius, borderWidth });
    }

    return result;
  }, [level, maxRings, baseRadius]);

  if (rings.length === 0) {
    return null;
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', className)}>
      {rings.map((ring, i) => {
        return (
          <div
            key={i}
            className="absolute rounded-full transition-all duration-150 will-change-[transform,opacity]"
            style={{
              width: ring.size,
              height: ring.size,
              borderStyle: 'solid',
              borderWidth: ring.borderWidth,
              backgroundColor: color,
              opacity: ring.opacity,
            }}
          />
        );
      })}
    </div>
  );
}
