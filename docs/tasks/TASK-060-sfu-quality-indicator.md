# TASK-060 — SFU Connection Quality Indicator

## Status
planned

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
- [ ] Quality stats collected from mediasoup
- [ ] Quality indicator component created
- [ ] Visual quality badges displayed
- [ ] Detailed stats on hover
- [ ] Updates in real-time
- [ ] Works for each participant

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in component code
- TypeScript types are strict
- Performance optimized (throttle updates)

## Related Files
- `apps/client/src/components/room/QualityIndicator.tsx`
- `apps/client/src/hooks/use-quality-stats.ts`

## Next Task
TASK-043 — Video Grid Layout
