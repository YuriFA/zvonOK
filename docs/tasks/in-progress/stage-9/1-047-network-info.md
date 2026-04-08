# TASK-047 — Network Quality Metrics Display

> **Status:** in-progress
> **Priority:** low
> **Created:** 2026-02-08
> **Updated:** 2026-04-08

---

## Description

Complete the network quality metrics display pipeline: add jitter to stats, extend the
`QualityIndicator` tooltip with full metrics, and rename the stats hook to its canonical name.

The core infrastructure (stats collection, quality scoring, `QualityIndicator`, `RoomVideo`
wiring) is already implemented. This task completes the remaining gaps.

## What Is Already Done

- `SfuStatsCollector` — polls mediasoup transport + consumer stats every 2 s
- `calculateQualityScore` — maps raw stats to 0–100 score + `QualityLevel`
- `PeerQualityProvider` + `PeerQualityStore` — React state management for per-peer quality
- `QualityIndicator` — signal-bar UI component with tooltip
- `RoomVideo` — reads from `PeerQualityStore`, renders `QualityIndicator` per video tile
- `use-quality-stats.ts` — hook wrapping `sfuManager.onQualityStats()`

## Scope

1. **Rename** `use-quality-stats.ts` → `use-connection-stats.ts`; update all imports
2. **Add jitter** to `QualityStats` type, collect it in `SfuStatsCollector`, factor it into
   `calculateQualityScore`, display it in the `QualityIndicator` tooltip
3. **Update tests** — `stats-collector.test.ts`, `quality-score.test.ts`,
   `quality-indicator.test.tsx` and any test referencing `useQualityStats`

## Technical Design

### Jitter

`inbound-rtp` WebRTC stat exposes `jitter` in seconds; convert to ms:

```typescript
// in SfuStatsCollector.getConsumerStats()
const jitter = (stat.jitter ?? 0) * 1000; // seconds → ms
```

Add to `QualityStats`:

```typescript
export interface QualityStats {
  bitrate: number;    // kbps
  packetLoss: number; // %
  rtt: number;        // ms
  jitter: number;     // ms
  width: number;
  height: number;
  fps: number;
}
```

Jitter penalty in `calculateQualityScore`:

```typescript
// Jitter penalty (after RTT penalty block)
if (stats.jitter > 100) {
  score -= 20;
} else if (stats.jitter > 50) {
  score -= 10;
} else if (stats.jitter > 20) {
  score -= 5;
}
```

Tooltip line in `QualityIndicator`:

```typescript
`Jitter: ${Math.round(stats.jitter)}ms`,
```

### Rename Hook

```
apps/client/src/hooks/use-quality-stats.ts → use-connection-stats.ts
```

Exported names: `useConnectionStats`, `UseConnectionStatsOptions`, `UseConnectionStatsResult`.

Update all import sites (search for `use-quality-stats` and `useQualityStats`).

## Acceptance Criteria

- `use-connection-stats.ts` is the canonical hook; `use-quality-stats.ts` does not exist
- `QualityStats` includes `jitter: number`
- Jitter is collected from `inbound-rtp` for both audio and video consumers
- Jitter is shown in the `QualityIndicator` tooltip
- Jitter contributes to `calculateQualityScore`
- All existing tests pass; new/updated tests cover jitter collection and scoring

## Definition of Done

- Rename complete; no references to old name remain
- Jitter collected, scored, and displayed
- TypeScript compiles without errors (`pnpm -C apps/client build`)
- Tests pass (`pnpm -C apps/client test:run`)

## Related Files

- `apps/client/src/hooks/use-connection-stats.ts` ← rename target
- `apps/client/src/lib/sfu/types.ts` — add `jitter` to `QualityStats`
- `apps/client/src/lib/sfu/stats-collector.ts` — collect jitter
- `apps/client/src/lib/sfu/quality-score.ts` — jitter penalty
- `apps/client/src/components/room/quality-indicator.tsx` — tooltip line
- `apps/client/src/lib/sfu/__tests__/stats-collector.test.ts`
- `apps/client/src/lib/sfu/__tests__/quality-score.test.ts`
- `apps/client/src/components/room/__tests__/quality-indicator.test.tsx`
- `apps/client/src/features/room/contexts/peer-quality.context.tsx` — may import hook
