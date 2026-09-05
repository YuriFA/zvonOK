# TASK-048 — Adaptive Video Quality via Simulcast

> **Status:** completed
> **Priority:** low
> **Created:** 2026-02-08

---

## Description

Implement bandwidth-adaptive video quality using mediasoup simulcast. The producer sends multiple spatial layers (low/mid/high); the server selects the appropriate layer per consumer based on the receiver's reported quality score.

## Prerequisites

TASK-047 (Network Quality Metrics) is complete. The following already exist:
- `SfuStatsCollector` — polls transport + consumer stats every 2 s
- `QualityScore` / `QualityLevel` — derived from bitrate, RTT, jitter, packet loss, resolution, fps
- `PeerQualityProvider` + `PeerQualityStore` — per-peer quality state via `useSyncExternalStore`
- `QualityIndicator` — visual quality badge per participant tile

This task builds on that pipeline to **act on** the quality data by switching simulcast layers.

## Scope

- Define simulcast encodings for video producers (low / mid / high spatial layers)
- Pass `encodings` when creating a video producer on the client
- Add `sfu:set-preferred-layers` event (client → server) to request a spatial layer for a consumer
- Map `QualityLevel` → spatial layer on the client (excellent/good → high, fair → mid, poor → low)
- Server calls `consumer.setPreferredLayers()` on the requested consumer
- Debounce layer switching to avoid rapid oscillation

## Technical Design

### 1. Simulcast Encodings

Added to `mediasoup.config.ts` as a shared constant and passed to `sendTransport.produce()` on the client.

```typescript
export const SIMULCAST_ENCODINGS: ProducerEncoding[] = [
  { rid: 'low',  maxBitrate: 150_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
  { rid: 'mid',  maxBitrate: 500_000, scaleResolutionDownBy: 2, maxFramerate: 24 },
  { rid: 'high', maxBitrate: 2_000_000 },
];
```

### 2. Client — Producer

In `SfuManager.doProduceTrack()`, pass `encodings` for video kind:

```typescript
const produceOptions: ProduceOptions = {
  track,
  encodings: kind === 'video' ? SIMULCAST_ENCODINGS : undefined,
  codecOptions: kind === 'video'
    ? { videoGoogleStartBitrate: 1000 }
    : { opusStereo: true, opusDtx: true },
};
```

### 3. Quality Level → Spatial Layer Mapping

```typescript
function qualityToSpatialLayer(level: QualityLevel): number {
  switch (level) {
    case 'excellent':
    case 'good':    return 2; // high
    case 'fair':    return 1; // mid
    case 'poor':    return 0; // low
  }
}
```

### 4. Client → Server Signalling

New Socket.io event:

```
sfu:set-preferred-layers  { consumerId, spatialLayer }
```

Client emits after debouncing (e.g. 3 s) to prevent oscillation. Only emits when the computed layer differs from the current one.

### 5. Server — setPreferredLayers

In `SfuGateway`, handle the event:

```typescript
@SubscribeMessage('sfu:set-preferred-layers')
async handleSetPreferredLayers(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { consumerId: string; spatialLayer: number },
) {
  const consumer = this.sfuService.getConsumer(data.consumerId);
  await consumer.setPreferredLayers({
    spatialLayer: data.spatialLayer,
    temporalLayer: 2,
  });
}
```

`SfuService` exposes a method to look up a consumer by ID for the requesting peer.

### 6. Layer Switching Trigger

In `PeerQualityProvider` (or a new `useSimulcastLayerSwitch` hook), subscribe to `PeerQualityStore` changes and emit `sfu:set-preferred-layers` through `SfuManager` when the layer changes.

## Acceptance Criteria

- [ ] Video producer created with 3 simulcast spatial layers (low/mid/high)
- [ ] Consumer switches to `spatialLayer 0` when receiver quality is `poor`
- [ ] Consumer switches to `spatialLayer 2` when receiver quality is `excellent` or `good`
- [ ] Consumer switches to `spatialLayer 1` when receiver quality is `fair`
- [ ] Layer switching is debounced (no rapid oscillation under fluctuating network)
- [ ] Media stream is not interrupted during layer switches
- [ ] `QualityIndicator` reflects the actual bitrate of the active layer
- [ ] Unit tests cover `qualityToSpatialLayer` mapping
- [ ] Server validates consumer ownership before calling `setPreferredLayers`

## Definition of Done

- Simulcast encodings configured in `mediasoup.config.ts`
- Client passes encodings on video produce
- Server handles `sfu:set-preferred-layers` with ownership check
- Layer switching wired into existing quality stats pipeline
- Lint and tests pass (`pnpm -C apps/server lint && pnpm -C apps/server test`)
- SDD updated if API surface changes

## Related Files

**Server (modify):**
- `apps/server/src/sfu/config/mediasoup.config.ts` — add `SIMULCAST_ENCODINGS`
- `apps/server/src/sfu/sfu.gateway.ts` — handle `sfu:set-preferred-layers`
- `apps/server/src/sfu/sfu.service.ts` — expose consumer lookup for ownership check
- `apps/server/src/sfu/interfaces/sfu.interface.ts` — new event payload types

**Client (modify):**
- `apps/client/src/lib/sfu/sfu-manager.ts` — pass encodings on produce, emit set-preferred-layers
- `apps/client/src/lib/sfu/types.ts` — new event types
- `apps/client/src/features/room/contexts/peer-quality.context.tsx` — trigger layer switching

## Next Task

TASK-049 — Automatic Reconnection
