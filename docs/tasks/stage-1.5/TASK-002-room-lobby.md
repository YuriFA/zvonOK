# TASK-062 — Room Pre-Join State

## Status
completed

## Priority
high

## Description
Add a pre-join state to the room page that the room creator enters after creating a room. The pre-join state allows users to set up their devices (camera, microphone), preview their video, and share the room link before joining the actual call.

> **Note:** This was originally implemented as a separate `/room/:slug/lobby` route with a `RoomLobbyPage` component. It has since been refactored into a `PrejoinView` component rendered as a state within the `RoomPage` at `/room/:slug`.

## Scope
- Pre-join state within `/room/:slug` route
- PrejoinView component with video preview
- Device selection (camera, microphone dropdowns)
- Device toggle buttons (camera/mic on/off)
- Shareable room link with copy button
- "Join Room" button to enter the actual room
- Room creation redirects to `/room/:slug` (pre-join state)

## Out of Scope
- WebRTC connection implementation (TASK-022 to TASK-026)
- Socket.io integration (TASK-023)
- Actual video streaming in preview (uses getUserMedia for local preview only)

## Technical Design

### Room Page States
```typescript
// apps/client/src/routes/room.tsx
type RoomViewState = 'prejoin' | 'active' | 'ended';
// The room page renders PrejoinView when viewState === 'prejoin'
```

### Room Creation Flow
```typescript
// apps/client/src/features/room/components/create-room-form.tsx
// After room creation:
navigate(`/room/${room.slug}`); // Opens in pre-join state
```

### Components Created
- `apps/client/src/features/room/components/prejoin-view.tsx` - Pre-join view within room page
- `apps/client/src/features/media/components/device-selector.tsx` - Device selection with video preview
- `apps/client/src/components/ui/copy-link.tsx` - Reusable copy link component

### Device Selector API
```typescript
// navigator.mediaDevices methods
getUserMedia({ video: true, audio: true }) // Get local stream
enumerateDevices() // Get available devices
```

### Copy Link API
```typescript
// navigator.clipboard
navigator.clipboard.writeText(url)
```

## Acceptance Criteria
- [x] Room page shows pre-join state with room info display
- [x] Video preview shows local camera feed
- [x] Camera toggle button (on/off) with icon change
- [x] Microphone toggle button (on/off) with icon change
- [x] Camera dropdown shows available video devices
- [x] Microphone dropdown shows available audio devices
- [x] Copy link component shows room URL with copy button
- [x] Copy button provides visual feedback ("Copied!")
- [x] "Join Room" button transitions to active call state
- [x] Media stream cleaned up on unmount
- [x] Room creation redirects to `/room/:slug` (pre-join state)

## Definition of Done
- All acceptance criteria satisfied
- Error handling for device permission denied
- Loading states for device enumeration
- TypeScript types are strict
- Media stream properly cleaned up to release devices

## Related Files
- `apps/client/src/features/room/components/prejoin-view.tsx` - Pre-join view component
- `apps/client/src/features/media/components/device-selector.tsx` - Device selector
- `apps/client/src/components/ui/copy-link.tsx` - Copy link component
- `apps/client/src/routes/room.tsx` - Room page with pre-join state
- `apps/client/src/features/room/components/create-room-form.tsx` - Room creation redirect
- `docs/SDD.md` - Architecture documentation (updated)

## Related Tasks
- TASK-024 — Media Stream (device permission handling)
- TASK-029 — Device Enumeration (list available devices)
- TASK-019 — Client-Side Room Functionality (base rooms implementation)
