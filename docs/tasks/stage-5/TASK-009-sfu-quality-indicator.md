# TASK-060 — SFU Connection Quality Indicator

## Status
completed

## Priority
medium

## Description
Display connection quality metrics for each participant in SFU group calls. Shows bitrate, packet loss, and connection quality score.

## Scope
- Quality stats collection from mediasoup
- Quality indicator component
- Visual quality badges (Good/Fair/Poor)
- Detailed stats on hover
- Participant-specific quality

## Out of Scope
- Network info display (TASK-048)
- Bandwidth adaptation (TASK-049)

## Technical Design

### Quality Metrics
```typescript
interface QualityStats {
  bitrate: number;        // kbps
  packetLoss: number;     // percentage
  rtt: number;            // ms
  width: number;
  height: number;
  fps: number;
}

interface QualityScore {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;          // 0-100
}
```

### Quality Calculation
```typescript
function calculateQuality(stats: QualityStats): QualityScore {
  // Consider bitrate, packet loss, resolution, fps
  // Return score and level
}
```

## Acceptance Criteria
- [x] Quality stats collected from mediasoup
- [x] Quality indicator component created
- [x] Visual quality badges displayed
- [x] Detailed stats on hover
- [x] Updates in real-time
- [x] Works for each participant

## Definition of Done
- [x] Acceptance criteria satisfied
- [x] No TODOs in component code
- [x] TypeScript types are strict
- [x] Performance optimized (throttle updates)
- [x] Tests pass

## Related Files
- `apps/client/src/components/room/QualityIndicator.tsx`
- `apps/client/src/hooks/use-quality-stats.ts`

## Next Task
TASK-043 — Video Grid Layout
