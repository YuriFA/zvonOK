# TASK-047 — Network Quality Metrics Display

## Status
planned

## Priority
low

## Description
Monitor and display WebRTC connection quality metrics: bitrate, packet loss, jitter, and RTT.

## Scope
- Create useConnectionStats hook
- Poll getStats() every second
- Parse RTCStatsReport
- Calculate quality indicator (good/medium/poor)
- Display metrics in UI
- Warn user on poor connection

## Technical Design

### Metrics
- Video bitrate (bps)
- Audio bitrate (bps)
- Packet loss (%)
- Jitter (ms)
- RTT/Round Trip Time (ms)

### Quality Determination
```typescript
if (packetLoss > 5 || rtt > 300) return 'poor';
if (packetLoss > 2 || rtt > 150) return 'medium';
return 'good';
```

### getStats() Usage
```typescript
const stats = await peerConnection.getStats();
// Parse inbound-rtp for video/audio
// Parse candidate-pair for RTT
```

## Acceptance Criteria
- Stats collected every second
- Quality indicator displayed
- Metrics visible to user
- Warnings on poor connection

## Definition of Done
- Stats hook working
- UI component displays metrics
- Quality indicator accurate
- Performance acceptable

## Implementation Guide
See: `docs/tasks/phase-10-quality/10.1-network-info.md`

## Related Files
- `apps/client/src/hooks/use-connection-stats.ts`
- `apps/client/src/components/network-stats.tsx`

## Next Task
TASK-048 — Bandwidth Adaptation
