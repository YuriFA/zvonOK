# TASK-062 — Room Lobby Page

## Status
completed

## Priority
high

## Description
Add a room lobby page that the room creator enters after creating a room. The lobby allows users to set up their devices (camera, microphone), preview their video, and share the room link before joining the actual call.

## Scope
- New `/room/:slug/lobby` route
- Room lobby page with video preview
- Device selection (camera, microphone dropdowns)
- Device toggle buttons (camera/mic on/off)
- Shareable room link with copy button
- "Join Room" button to enter the actual room
- Update room creation redirect to go to lobby first

## Out of Scope
- WebRTC connection implementation (TASK-022 to TASK-026)
- Socket.io integration (TASK-023)
- Actual video streaming in preview (uses getUserMedia for local preview only)

## Technical Design

### Route Changes
```typescript
// apps/client/src/main.tsx
{
  path: "/room/:slug/lobby",
  Component: RoomLobbyPage,
},
// Must come BEFORE /room/:slug for correct path matching
```

### Room Creation Flow
```typescript
// apps/client/src/features/room/components/create-room-form.tsx
// After room creation:
navigate(`/room/${room.slug}/lobby`); // Was: navigate(`/room/${room.slug}`);
```

### Components to Create
- `apps/client/src/routes/room-lobby.tsx` - Room lobby page
- `apps/client/src/features/media/components/device-selector.tsx` - Device selection with video preview
- `apps/client/src/components/ui/copy-link.tsx` - Reusable copy link component

### Components to Modify
- `apps/client/src/main.tsx` - Add /room/:slug/lobby route
- `apps/client/src/features/room/components/create-room-form.tsx` - Update redirect

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
- [ ] `/room/:slug/lobby` route configured in main.tsx
- [ ] RoomLobbyPage component created with room info display
- [ ] Video preview shows local camera feed
- [ ] Camera toggle button (on/off) with icon change
- [ ] Microphone toggle button (on/off) with icon change
- [ ] Camera dropdown shows available video devices
- [ ] Microphone dropdown shows available audio devices
- [ ] Copy link component shows room URL with copy button
- [ ] Copy button provides visual feedback ("Copied!")
- [ ] "Join Room" button navigates to `/room/:slug`
- [ ] Media stream cleaned up on unmount
- [ ] Room creation redirects to `/room/:slug/lobby`

## Definition of Done
- All acceptance criteria satisfied
- Error handling for device permission denied
- Loading states for device enumeration
- TypeScript types are strict
- Media stream properly cleaned up to release devices

## Related Files
- `apps/client/src/routes/room-lobby.tsx` - Room lobby page (NEW)
- `apps/client/src/features/media/components/device-selector.tsx` - Device selector (NEW)
- `apps/client/src/components/ui/copy-link.tsx` - Copy link component (NEW)
- `apps/client/src/main.tsx` - Routing configuration
- `apps/client/src/features/room/components/create-room-form.tsx` - Room creation redirect
- `docs/SDD.md` - Architecture documentation (updated)

## Related Tasks
- TASK-024 — Media Stream (device permission handling)
- TASK-029 — Device Enumeration (list available devices)
- TASK-019 — Client-Side Room Functionality (base rooms implementation)
