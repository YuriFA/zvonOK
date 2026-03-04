# TASK-043 — Active Speaker Detection

## Status
planned

## Priority
medium

## Description

Implement audio level detection to identify and highlight the active speaker in group calls.

## Scope
- Monitor audio levels from RTCStats
- Calculate audio energy
- Identify loudest speaker
- Highlight active speaker in UI
- Debounce speaker changes

## Technical Design

### Audio Level Detection
```typescript
const stats = await receiver.getStats();
const audioLevel = stats.audioLevel; // 0-127 (dBov)
```

### Thresholds
- audioLevel > 30: speaking
- audioLevel < 20: silent

## Acceptance Criteria
- Active speaker highlighted
- Detection latency < 500ms
- False positives minimized
- Visual indicator clear

## Definition of Done
- Speaker detection working
- UI highlighting functional
- Performance acceptable

## Related Files
- `apps/client/src/hooks/use-active-speaker.ts`

## Next Task
TASK-044 — HTTPS with Caddy
