import type { QualityScore, QualityStats } from "@zvonok/client/sfu/types";

import { cn } from "@/lib/utils";

const levelConfig = {
  excellent: {
    label: "Excellent",
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
  good: {
    label: "Good",
    color: "text-green-400",
    bgColor: "bg-green-400",
  },
  fair: {
    label: "Fair",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
  },
  poor: {
    label: "Poor",
    color: "text-red-500",
    bgColor: "bg-red-500",
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
    `Jitter: ${Math.round(stats.jitter)}ms`,
    `Packet Loss: ${stats.packetLoss.toFixed(1)}%`,
  ];

  if (stats.width && stats.height) {
    lines.push(`Resolution: ${stats.width}x${stats.height}`);
  }

  if (stats.fps) {
    lines.push(`FPS: ${stats.fps}`);
  }

  return lines.join("\n");
}

interface Props {
  score: QualityScore;
  stats?: QualityStats;
  showDetails?: boolean;
}

export function QualityIndicator({ score, stats, showDetails = false }: Props) {
  const config = levelConfig[score.level];

  return (
    <div
      className={cn("flex items-center gap-1", config.color)}
      title={stats ? formatTooltip(stats, score) : `${config.label} (${score.score}/100)`}
      aria-label={`Connection quality: ${score.level}`}
    >
      <div className="flex h-5 items-end justify-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const cellPercent = (i + 1) * 20;
          return (
            <div
              key={i}
              style={{ height: `${cellPercent}%` }}
              className={cn("w-0.5 bg-muted-foreground", {
                [config.bgColor]: cellPercent <= score.score,
              })}
            />
          );
        })}
      </div>
      {showDetails && (
        <>
          <span>{config.label}</span>
          {stats && <span className="opacity-70">{formatBitrate(stats.bitrate)}</span>}
        </>
      )}
    </div>
  );
}
