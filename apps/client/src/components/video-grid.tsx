import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface VideoGridProps {
  children: ReactNode;
  className?: string;
}

function getGridClass(count: number): string {
  if (count === 1) return 'grid-cols-1';
  return 'grid-cols-2';
}

export function VideoGrid({ children, className }: VideoGridProps) {
  const childArray = useMemo(() => {
    return Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  }, [children]);

  const count = childArray.length;
  const gridClass = getGridClass(count);
  const isLastCentered = count > 1 && count % 2 === 1;

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {childArray.map((child, index) => {
        const isLast = index === count - 1;

        if (isLast && isLastCentered) {
          const key = (child as { key?: React.Key })?.key ?? index;
          return (
            <div key={key} className="col-span-2 flex justify-center">
              <div className="w-1/2">{child}</div>
            </div>
          );
        }
        return child;
      })}
    </div>
  );
}

/**
 * Video tile wrapper that maintains aspect ratio and provides consistent styling.
 */
export interface VideoTileProps {
  children: ReactNode;
  className?: string;
  /** Whether this tile represents the active speaker */
  isActiveSpeaker?: boolean;
}

export function VideoTile({ children, className, isActiveSpeaker = false }: VideoTileProps) {
  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden rounded-lg transition-all duration-300',
        isActiveSpeaker && 'ring-4 ring-green-500 ring-offset-2 ring-offset-background',
        className
      )}
    >
      {children}
    </div>
  );
}
