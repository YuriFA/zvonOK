import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  children: ReactNode;
  className?: string;
}

export function VideoGrid({ children, className }: VideoGridProps) {
  return (
    <div className={cn('grid min-h-0 items-start grid-cols-2 gap-4', className)}>
      {children}
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
        'relative aspect-video max-h-full overflow-hidden rounded-lg transition-all duration-300',
        isActiveSpeaker && 'ring-4 ring-green-500 ring-offset-2 ring-offset-background',
        className
      )}
    >
      {children}
    </div>
  );
}
