# TASK-106 — Screen Share as Separate SFU Producer

> **Status:** in-progress
> **Priority:** high
> **Created:** 2026-04-10

---

## Description

Refactor screen sharing from `replaceTrack` on the camera video producer to a dedicated second video producer with `appData: { source: 'screen' }`. The camera producer must remain active and unchanged while screen share is running.

Only one participant can share their screen at a time. The server must enforce this rule, expose a deterministic error back to the requester, and notify all peers when the room becomes blocked or unblocked for screen sharing.

This task also introduces the minimum data-model changes required to support two simultaneous remote video sources per peer without regressing the current camera experience. Full layout changes remain in TASK-107.

Depends on: TASK-027, TASK-080.

## Scope

- Server: support producer `appData.source` for `camera` and `screen`
- Server: track the active screen sharer per room and reject concurrent screen share attempts
- Server: implement `sfu:close-producer` gateway handler and shared producer cleanup path
- Server: broadcast `sfu:screen-share-started` / `sfu:screen-share-stopped` room-wide
- Client `SfuManager`: add `produceScreen()` and `closeScreenProducer()` methods
- Client `SfuManager`: add explicit produce request/response correlation so camera and screen producers can coexist
- Client `SfuManager`: forward producer `source` metadata to remote peer/consumer state
- Client state model: represent camera video and screen video separately for the same peer
- Client `useScreenShare`: switch from `replaceTrack` to dedicated screen producer lifecycle
- Client controls: expose `isScreenShareBlocked` to disable the button for non-sharers
- Tests: update server and client unit tests for the new producer lifecycle and blocking behavior
- Docs: update `docs/SDD.md` and any affected module docs for the SFU contract changes

## Out of Scope

- Spotlight / dedicated layout for rendering screen share (TASK-107)
- Audio sharing alongside screen share
- Recording or persistence of screen share state
- Simulcast optimization for screen share beyond omitting camera simulcast encodings for the screen producer

## Technical Design

### Producer model

Local and remote video producers now have an explicit media source:

```typescript
type SfuMediaSource = 'camera' | 'screen';
```

Rules:

- A peer may have at most one `audio` producer
- A peer may have at most one `video` producer with `source: 'camera'`
- A peer may have at most one `video` producer with `source: 'screen'`
- A room may have at most one active `source: 'screen'` producer across all peers

`source: 'camera'` is the default for normal video publishing.

### WebSocket contract changes

The current `sfu:producer-created` payload is not enough once two local `video` producers exist. Matching only by `kind` is ambiguous. This task adds an explicit request ID to the produce handshake.

#### Updated events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `sfu:produce` | client -> server | `{ requestId, transportId, kind, rtpParameters, appData? }` | Create producer |
| `sfu:producer-created` | server -> client | `{ requestId, producerId, userId, kind, appData? }` | Producer created for a specific request |
| `sfu:produce-error` | server -> client | `{ requestId, code, message }` | Producer creation rejected or failed |
| `sfu:new-producer` | server -> peers | `{ producerId, userId, username, kind, paused, appData? }` | Notify peers about a consumable producer |
| `sfu:close-producer` | client -> server | `{ producerId }` | Close and clean up a producer server-side |
| `sfu:screen-share-started` | server -> room | `{ userId }` | Someone started sharing |
| `sfu:screen-share-stopped` | server -> room | `{ userId }` | Sharing stopped |

#### Error codes

Use a stable string code so the client can distinguish business-rule failures from generic transport errors:

```typescript
type SfuProduceErrorCode =
  | 'SCREEN_SHARE_ALREADY_ACTIVE'
  | 'SEND_TRANSPORT_NOT_READY'
  | 'TRANSPORT_NOT_FOUND'
  | 'PRODUCE_FAILED';
```

For this task, `SCREEN_SHARE_ALREADY_ACTIVE` is the only user-facing error that needs dedicated UI handling.

### Server changes

#### `apps/server/src/sfu/interfaces/sfu.interface.ts`

Add payload types:

```typescript
type SfuMediaSource = 'camera' | 'screen';

interface SfuProduceAppData {
  source?: SfuMediaSource;
}

interface SfuProducePayload {
  requestId: string;
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData?: SfuProduceAppData;
}

interface SfuProducerCreatedPayload {
  requestId: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  appData?: SfuProduceAppData;
}

interface SfuProduceErrorPayload {
  requestId: string;
  code: SfuProduceErrorCode;
  message: string;
}

interface SfuCloseProducerPayload {
  producerId: string;
}

interface SfuScreenShareStartedPayload {
  userId: string;
}

interface SfuScreenShareStoppedPayload {
  userId: string;
}
```

Also extend `sfu:new-producer` payload to include `appData?.source`.

#### `apps/server/src/sfu/sfu.service.ts`

Add per-room screen share tracking:

```typescript
// roomId -> socketId of the current screen sharer
private roomScreenShare: Map<string, string> = new Map();
```

Create a shared helper for producer teardown:

```typescript
private closeProducerForPeer(socketId: string, producerId: string): void
```

Responsibilities:

- find the producer on the peer
- detect whether it is the active screen-share producer
- close it
- remove it from `peer.producers`
- if it was `source: 'screen'`, release `roomScreenShare`
- emit `sfu:screen-share-stopped` when the room lock is released

This helper must be used by all producer exit paths:

- `sfu:close-producer`
- disconnect / `closePeer`
- `leaveRoom`
- `kickPeer`
- any future bulk room cleanup that closes peer producers explicitly

In `createProducer()`:

1. Read `payload.appData?.source ?? 'camera'`
2. Pass `appData` into mediasoup `produce()`
3. If `source === 'screen'`, check `roomScreenShare`
4. If another socket already holds the room lock:
   - do not keep the producer
   - emit `sfu:produce-error` with `code: 'SCREEN_SHARE_ALREADY_ACTIVE'` and the same `requestId`
   - return without emitting `sfu:producer-created`
5. Otherwise store the producer, set the room lock, and notify peers with `sfu:screen-share-started`
6. Emit `sfu:producer-created` including `requestId` and `appData`
7. Broadcast `sfu:new-producer` including `appData`

Recommended shape:

```typescript
const source = payload.appData?.source ?? 'camera';

if (source === 'screen') {
  const existingSharer = this.roomScreenShare.get(roomId);
  if (existingSharer && existingSharer !== socket.id) {
    socket.emit('sfu:produce-error', {
      requestId: payload.requestId,
      code: 'SCREEN_SHARE_ALREADY_ACTIVE',
      message: 'Another participant is already sharing',
    });
    return;
  }
}

const producer = await peer.sendTransport.produce({
  kind,
  rtpParameters,
  appData: { source },
});
```

If producer creation itself fails, emit `sfu:produce-error` with `code: 'PRODUCE_FAILED'` for the same `requestId`.

#### `apps/server/src/sfu/sfu.gateway.ts`

Add handler:

```typescript
@SubscribeMessage('sfu:close-producer')
handleCloseProducer(client: Socket, payload: SfuCloseProducerPayload) {
  this.sfuService.closeProducer(client.id, payload.producerId);
}
```

No Socket.IO ack is required for this task. Use explicit `sfu:producer-created` / `sfu:produce-error` events because they fit the current event-driven SFU gateway and keep request/response semantics symmetrical.

### Client changes

#### `apps/client/src/lib/sfu/types.ts`

Add:

```typescript
type SfuMediaSource = 'camera' | 'screen';

interface SfuProduceAppData {
  source?: SfuMediaSource;
}

interface SfuProducePayload {
  requestId: string;
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData?: SfuProduceAppData;
}

interface SfuProducerCreatedPayload {
  requestId: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  appData?: SfuProduceAppData;
}

interface SfuProduceErrorPayload {
  requestId: string;
  code: SfuProduceErrorCode;
  message: string;
}

interface SfuNewProducerPayload {
  producerId: string;
  userId: string;
  username: string;
  kind: 'audio' | 'video';
  paused: boolean;
  appData?: SfuProduceAppData;
}
```

Extend `SfuState`:

```typescript
interface SfuState {
  ...
  screenProducerId: string | null;
  isScreenShareBlocked: boolean;
}
```

#### `apps/client/src/lib/sfu/interfaces.ts`

Add to `ISfuManager`:

```typescript
produceScreen(track: MediaStreamTrack): Promise<void>;
closeScreenProducer(): Promise<void>;
```

Keep `replaceTrack()` for camera/mic device switching; it is no longer used by `useScreenShare`.

#### `apps/client/src/lib/sfu/manager.ts`

Implement producer creation by request ID instead of matching only by `kind`.

Add a helper similar to:

```typescript
private async produceWithSource(
  track: MediaStreamTrack,
  source: SfuMediaSource,
): Promise<Producer | null>
```

Requirements:

- `produce(track)` publishes `source: 'camera'` for video and no `source` for audio, or explicitly `camera` for video if that is simpler
- `produceScreen(track)` publishes `source: 'screen'`
- use a unique `requestId` per `sendTransport.produce()` call
- resolve the produce callback only when `sfu:producer-created.requestId` matches
- reject or resolve `null` when `sfu:produce-error.requestId` matches
- do not match camera and screen producers by `kind` alone
- store the returned producer in `producers`
- update `state.videoProducerId` only for camera video
- update `state.screenProducerId` only for screen video
- omit simulcast encodings for `source: 'screen'`
- keep existing simulcast encodings for `source: 'camera'`

`closeScreenProducer()`:

- find the local producer where `producer.kind === 'video'` and `producer.appData?.source === 'screen'`
- close it locally
- emit `sfu:close-producer { producerId }`
- clear `state.screenProducerId`
- set `isScreenShareBlocked = false` locally for the sharer

Add handlers:

- `handleScreenShareStarted({ userId })`
  - if `userId !== localUserId`, set `isScreenShareBlocked = true`
- `handleScreenShareStopped({ userId })`
  - if `userId !== localUserId`, set `isScreenShareBlocked = false`

The manager already knows the current user from `joinRoom(payload)`. Persist that `userId` so it can distinguish local vs remote screen-share lock events.

#### Minimum remote-state change required in TASK-106

The existing remote model replaces one `video` track with another. That is no longer valid once peers may have both camera and screen producers.

Introduce the minimum separation needed now so TASK-106 does not regress remote camera playback:

```typescript
interface RemotePeerMedia {
  userId: string;
  username: string;
  cameraStream: MediaStream;
  screenStream: MediaStream | null;
  audioStream: MediaStream;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  isAudioEnabled: boolean;
}
```

Or an equivalent shape with per-source track buckets.

Requirements:

- incoming remote `video` with `appData.source === 'camera'` must update only the camera slot
- incoming remote `video` with `appData.source === 'screen'` must update only the screen slot
- incoming `audio` must remain independent
- existing room grid should continue rendering `cameraStream`
- screen stream may remain unused by the layout until TASK-107, but it must be preserved in state for later consumption

This task is allowed to minimally extend `SfuTrackCallback` / peer metadata so consumers know the producer `source` for each received track.

#### `apps/client/src/lib/sfu/event-router.ts`

Wire up:

```typescript
socket.on('sfu:screen-share-started', (payload) => manager.handleScreenShareStarted(payload));
socket.on('sfu:screen-share-stopped', (payload) => manager.handleScreenShareStopped(payload));
socket.on('sfu:produce-error', (payload) => manager.handleProduceError(payload));
```

#### `apps/client/src/hooks/use-screen-share.ts`

Replace `replaceTrack` logic with a dedicated producer lifecycle:

```typescript
startScreenShare():
  1. navigator.mediaDevices.getDisplayMedia(...)
  2. sfuManager.produceScreen(screenTrack)
  3. setIsSharing(true)
  4. screenTrack.addEventListener('ended', stopScreenShare)

stopScreenShare():
  1. sfuManager.closeScreenProducer()
  2. stop local screen track
  3. setIsSharing(false)
```

Expose `isScreenShareBlocked` from the hook.

When `produceScreen()` fails with `SCREEN_SHARE_ALREADY_ACTIVE`, map it to a dedicated screen-share error code instead of generic `denied`, for example:

```typescript
type ScreenShareError = 'cancelled' | 'denied' | 'unsupported' | 'blocked';
```

#### `apps/client/src/features/room/components/active-room-view.tsx`

- Pass `isScreenShareBlocked` from `useScreenShare()` to `RoomCenterControls`
- If `startScreenShare()` throws `'blocked'`, show a specific toast such as `Another participant is already sharing`

#### `apps/client/src/features/room/components/room-center-controls.tsx`

Add prop:

```typescript
isScreenShareBlocked: boolean;
```

Behavior:

- disable the button when `screenShareState === 'starting' || isScreenShareBlocked`
- do not disable the button for the local sharer while they are actively sharing
- tooltip when blocked: `Another participant is sharing their screen`

### Documentation changes

Because this task changes the SFU signaling contract, update before or alongside implementation:

- `docs/SDD.md`
- `docs/modules/sfu.md`
- any sequence diagrams or client module docs that mention `sfu:produce`, `sfu:producer-created`, or `sfu:new-producer`

### Testing

#### Server

- add tests for `sfu:close-producer`
- add tests for rejecting a second room screen share with `sfu:produce-error`
- add tests that disconnect, leave, and kick all release the screen-share lock
- add tests that `sfu:new-producer` and `sfu:producer-created` include `appData.source`

#### Client

- update `SfuManager` tests for request ID correlation between `sfu:produce` and `sfu:producer-created`
- add tests for `sfu:produce-error` handling
- update `useScreenShare` tests to assert `produceScreen()` / `closeScreenProducer()` usage
- add tests for `'blocked'` error handling
- update room control tests for blocked button state and tooltip text
- update remote media tests so adding a screen track does not replace the peer's camera stream

## Acceptance Criteria

- [ ] Starting screen share creates a second local `video` producer with `appData.source === 'screen'`; the camera producer remains active and unchanged
- [ ] `sfu:produce` / `sfu:producer-created` are correlated by `requestId`, so camera and screen producers can be created concurrently without ambiguity
- [ ] Server rejects a second room screen-share attempt with `sfu:produce-error { code: 'SCREEN_SHARE_ALREADY_ACTIVE' }`
- [ ] When A starts sharing, all other participants receive `sfu:screen-share-started` and their screen-share button becomes disabled
- [ ] When A stops sharing via app button or browser `ended` event, `sfu:close-producer` is sent, server releases the room lock, and others receive `sfu:screen-share-stopped`
- [ ] If A disconnects, leaves the room, or is kicked while sharing, the lock is released and other participants become unblocked
- [ ] `sfu:close-producer` correctly closes the mediasoup producer server-side and removes it from peer state
- [ ] Remote camera video is not replaced or lost when a remote screen-share producer appears
- [ ] Remote screen-share tracks are preserved in client state for TASK-107, even if the current layout does not render them yet
- [ ] `isScreenShareBlocked` remains `false` for the participant who is currently sharing
- [ ] Unit tests for server service/gateway, `SfuManager`, `useScreenShare`, remote media state, and room controls are updated and passing
- [ ] `docs/SDD.md` and affected module docs reflect the new SFU event contract

## Related Files

- `docs/SDD.md`
- `docs/modules/sfu.md`
- `docs/architecture/sequence-sfu.md`
- `apps/server/src/sfu/interfaces/sfu.interface.ts`
- `apps/server/src/sfu/sfu.service.ts`
- `apps/server/src/sfu/sfu.gateway.ts`
- `apps/server/src/sfu/sfu.service.spec.ts`
- `apps/client/src/lib/sfu/types.ts`
- `apps/client/src/lib/sfu/interfaces.ts`
- `apps/client/src/lib/sfu/manager.ts`
- `apps/client/src/lib/sfu/event-router.ts`
- `apps/client/src/lib/sfu/__tests__/manager.test.ts`
- `apps/client/src/hooks/use-screen-share.ts`
- `apps/client/src/hooks/__tests__/use-screen-share.test.ts`
- `apps/client/src/hooks/use-mediasoup.ts`
- `apps/client/src/hooks/__tests__/use-mediasoup.test.ts`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/components/room-center-controls.tsx`
- `apps/client/src/features/room/components/__tests__/room-center-controls.test.tsx`
