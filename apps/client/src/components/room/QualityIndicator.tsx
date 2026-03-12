import { Signal, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityScore, QualityStats } from '@/lib/sfu/types';

export interface QualityIndicatorProps {
  score: QualityScore;
  stats?: QualityStats;
  showDetails?: boolean;
  compact?: boolean;
}

const levelConfig = {
  excellent: {
    label: 'Excellent',
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    iconColor: 'text-green-500',
  },
  good: {
    label: 'Good',
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    iconColor: 'text-green-400',
  },
  fair: {
    label: 'Fair',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    iconColor: 'text-yellow-500',
  },
  poor: {
    label: 'Poor',
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    iconColor: 'text-red-500',
  },
} as const;

function formatBitrate(kbps: number): string {
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  }
  return `${Math.round(kbps)} kbps`;
}

function formatTooltip(stats: QualityStats, score: QualityScore): string {
  const lines = [
    `Quality: ${score.level.charAt(0).toUpperCase() + score.level.slice(1)} (${score.score}/100)`,
    `Bitrate: ${formatBitrate(stats.bitrate)}`,
    `RTT: ${Math.round(stats.rtt)}ms`,
    `Packet Loss: ${stats.packetLoss.toFixed(1)}%`,
  ];

  if (stats.width && stats.height) {
    lines.push(`Resolution: ${stats.width}x${stats.height}`);
  }

  if (stats.fps) {
    lines.push(`FPS: ${stats.fps}`);
  }

  return lines.join('\n');
}

export function QualityIndicator({
  score,
  stats,
  showDetails = false,
  compact = false,
}: QualityIndicatorProps) {
  const config = levelConfig[score.level];

  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-1', config.color)}
        title={stats ? formatTooltip(stats, score) : `${config.label} (${score.score}/100)`}
        aria-label={`Connection quality: ${score.level}`}
      >
        <Signal className="size-3" />
        {showDetails && (
          <>
            <span>{config.label}</span>
            {stats && (
              <span className="opacity-70">{formatBitrate(stats.bitrate)}</span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        config.bgColor,
        config.color
      )}
      title={stats ? formatTooltip(stats, score) : `${config.label} (${score.score}/100)`}
      aria-label={`Connection quality: ${score.level}`}
    >
      <Wifi className="size-3" />
      <span>{config.label}</span>
      {showDetails && stats && (
        <span className="opacity-70">
          {formatBitrate(stats.bitrate)}
        </span>
      )}
    </div>
  );
}
