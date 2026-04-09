# TASK-107 — Screen Share Layout

> **Status:** planned
> **Priority:** medium
> **Created:** 2026-04-10

---

## Description

Update the room UI layout to display an active screen share stream in a dedicated large area, with participant camera tiles reduced to a sidebar or strip. When no screen share is active, the room must continue using the existing grid layout.

This task depends on TASK-106, which introduces a separate screen-share producer and preserves remote screen streams in client state without yet rendering them.

Depends on: TASK-106.

## Scope

- Detect when a local or remote screen-share stream is available
- Render a large spotlight area for the active screen share
- Render participant camera tiles in a compact strip alongside the spotlight
- Prefer the local screen stream for the sharer's own spotlight view
- Show the sharer's name/label on the spotlight
- Return to the normal participant grid when screen sharing stops
- Keep the layout responsive on desktop and mobile

## Out of Scope

- Changes to SFU signaling or producer lifecycle from TASK-106
- Audio sharing with screen share
- Recording or saving the screen share
- Presenter annotations, pointer overlay, or browser Picture-in-Picture integration

## Technical Design

### Prerequisite from TASK-106

After TASK-106, the client state must already preserve screen-share media separately from camera media. The room UI should build on that state instead of re-deriving screen share directly from low-level mediasoup consumers.

The expected shape can vary, but it must be equivalent to this idea:

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

For the local participant, `useScreenShare()` should expose the active local screen-share stream while sharing is on.

### Derived screen-share model

The room UI needs a single derived value describing the active spotlight stream:

```typescript
interface ActiveScreenShare {
  userId: string;
  sharerName: string;
  stream: MediaStream;
  isLocal: boolean;
}
```

Selection rules:

1. If the current user is sharing and a local screen stream exists, use the local stream for the spotlight
2. Otherwise, find the remote peer where `screenStream !== null` and `isScreenSharing === true`
3. If no local or remote screen stream exists, spotlight mode is off

Assumption: TASK-106 server rules guarantee at most one active screen sharer per room.

### Layout modes

The room has two rendering modes:

- Grid mode: current behavior when there is no active screen share
- Spotlight mode: active screen share in a large area plus participant camera strip

Camera tiles must continue to use participant camera streams, not screen streams.

### Layout structure

Illustrative structure:

```text
┌─────────────────────────────────────────────┐
│                                             │
│           Screen Share Spotlight            │
│                                             │
│  [Sharer Name]                              │
│                                             │
└───────────┬─────────────────────────────────┘
            │ Participant strip
  ┌────┐ ┌────┐ ┌────┐
  │ A  │ │ B  │ │ C  │
  └────┘ └────┘ └────┘
```

Desktop:

- spotlight should occupy most of the available area
- participant strip may be vertical or horizontal, whichever fits the current layout better

Mobile:

- spotlight remains primary
- participant strip should collapse into a horizontal scroll area below the spotlight

### New / modified components

#### `apps/client/src/features/room/components/screen-share-spotlight.tsx`

Create a dedicated presentation component:

```typescript
interface ScreenShareSpotlightProps {
  stream: MediaStream;
  sharerName: string;
}
```

Behavior:

- render a single `<video>` element
- `autoPlay`, `playsInline`, no controls
- `muted` when rendering the local user's own screen stream
- use `object-fit: contain`
- show sharer name as an overlay label

If a shared component is preferred, this can be implemented inside an existing room video component, but the spotlight-specific presentation must stay isolated from general tile rendering logic.

#### `apps/client/src/features/room/components/active-room-view.tsx`

Update `ActiveRoomView` to:

- derive `activeScreenShare` from local screen-share state plus `remotePeers`
- switch between grid mode and spotlight mode
- render the spotlight area when `activeScreenShare` is present
- continue rendering participant camera tiles from camera streams only

The local participant should see their own shared screen via the local `getDisplayMedia()` stream, not a looped-back remote-style SFU consumer.

#### Optional extraction: room layout helper

If the branching logic in `active-room-view.tsx` becomes too noisy, extract a small component such as:

```typescript
interface RoomLayoutProps {
  activeScreenShare: ActiveScreenShare | null;
  localTile: React.ReactNode;
  remoteTiles: React.ReactNode[];
}
```

Do not introduce extra abstraction unless it makes the render path materially easier to follow.

### Participant rendering rules

In spotlight mode:

- the spotlight uses the screen-share stream only
- participant tiles continue to show camera streams only
- the sharer's camera tile remains visible in the strip if their camera is enabled
- if the sharer camera is off, the participant tile should still render the normal avatar/placeholder state

In grid mode:

- preserve existing participant rendering behavior

### Local screen-share integration

`useScreenShare()` should expose enough information for the room view to render the local spotlight immediately:

```typescript
interface UseScreenShareResult {
  isSharing: boolean;
  screenStream: MediaStream | null;
  isScreenShareBlocked: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}
```

If the final hook shape differs slightly, it must still provide access to the active local screen stream while sharing.

### CSS / Tailwind guidance

Use the current visual language of the room page.

Recommended constraints:

- spotlight area uses `flex-1` or equivalent large grid region
- participant strip uses fixed-size compact tiles
- strip is scrollable when needed
- avoid viewport overflow in either mode

Reasonable starting point:

```text
desktop: spotlight + side strip or bottom strip
mobile: spotlight + horizontal strip below
```

## Acceptance Criteria

- [ ] When any participant starts screen sharing, the room switches to spotlight mode without a refresh
- [ ] The spotlight displays the active screen-share stream correctly with the right aspect handling
- [ ] The sharer's name is visible on the spotlight
- [ ] The local sharer sees their own screen in the spotlight using the local screen stream
- [ ] Participant tiles continue to display camera streams and are not replaced by the screen-share stream
- [ ] The sharer's camera tile remains visible in the participant strip when spotlight mode is active
- [ ] When screen sharing stops, the layout returns to the normal grid
- [ ] Layout remains usable on desktop and mobile without overflow or clipped controls
- [ ] No regressions to the current grid layout when no screen share is active

## Related Files

- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/components/room-video.tsx`
- `apps/client/src/features/room/components/screen-share-spotlight.tsx` (new)
- `apps/client/src/hooks/use-screen-share.ts`
- `apps/client/src/hooks/use-mediasoup.ts`
- `apps/client/src/features/room/hooks/use-room-session.ts`
- `apps/client/src/features/room/hooks/use-room-participants.ts`
