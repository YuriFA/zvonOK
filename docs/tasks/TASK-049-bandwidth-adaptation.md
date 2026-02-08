# TASK-048 — Adaptive Video Quality

## Status
planned

## Priority
low

## Description

Implement bandwidth-adaptive video quality using simulcast or codec adjustments.

## Scope
- Monitor available bandwidth
- Adjust video bitrate
- Implement simulcast (multiple quality layers)
- Switch quality layers based on conditions
- Notify user of quality changes

## Technical Design

### Bandwidth Estimation
```typescript
const stats = await sender.getStats();
const bandwidth = stats.bandwidth;
```

### Quality Adjustment
- High: >2 Mbps
- Medium: 500 Kbps - 2 Mbps
- Low: <500 Kbps

## Acceptance Criteria
- Video quality adapts to bandwidth
- Quality changes smooth
- User notified of changes

## Definition of Done
- Adaptive quality working
- User experience improved

## Related Files
- `apps/client/src/hooks/use-adaptive-quality.ts`

## Next Task
TASK-049 — Automatic Reconnection
