import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface VideoGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Returns grid class based on participant count.
 * - 1: Full width, centered
 * - 2: 2 columns
 * - 3-4: 2x2 grid
 * - 5-6: 3x2 grid
 * - 7+: 3-column grid
 */
function getGridClass(count: number): string {
  if (count === 1) {
    // Single participant - centered, max width
    return 'grid-cols-1 max-w-3xl mx-auto';
  }
  if (count === 2) {
    // Two participants - side by side
    return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
  }
  if (count <= 4) {
    // 3-4 participants - 2x2 grid
    return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
  }
  if (count <= 6) {
    // 5-6 participants - 3 columns
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }
  // 7+ participants - keep 3 columns as defined by the task
  return 'grid-cols-2 sm:grid-cols-3';
}

/**
 * Adaptive video grid that adjusts layout based on participant count.
 * Uses CSS Grid for responsive, aspect-ratio-preserving tiles.
 */
export function VideoGrid({ children, className }: VideoGridProps) {
  const childArray = useMemo(() => {
    return Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  }, [children]);

  const count = childArray.length;
  const gridClass = getGridClass(count);

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {childArray}
    </div>
  );
}

/**
 * Video tile wrapper that maintains aspect ratio and provides consistent styling.
 */
export interface VideoTileProps {
  children: ReactNode;
  className?: string;
}

export function VideoTile({ children, className }: VideoTileProps) {
  return (
    <div className={cn('relative aspect-video overflow-hidden', className)}>
      {children}
    </div>
  );
}
