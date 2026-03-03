# TASK-005 — LocalVideo Integration

## Status
completed

## Priority
medium

## Description
Integrate LocalVideo component into Room Lobby (DeviceSelector) and Room Page for consistent video display across the application.

## Scope
- Refactor DeviceSelector to use LocalVideo component
- Integrate LocalVideo into RoomPage when media stream is active
- Pass media stream from MediaStreamManager to LocalVideo

## Out of Scope
- RemoteVideo component (separate task)
- VideoGrid layout (Stage 8)
- SFU integration (Stage 7)

## Technical Design

### 1. DeviceSelector Refactor
Replace inline `<video>` element with LocalVideo component.

**Before:**
```tsx
<video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="h-full w-full object-cover"
/>
```

**After:**
```tsx
<LocalVideo
  stream={stream}
  isVideoEnabled={videoEnabled}
  isAudioEnabled={audioEnabled}
  className="aspect-video"
  showControls={false}
/>
```

### 2. RoomPage Integration
Add LocalVideo component to display user's own video during the call.

```tsx
// In RoomPage
const [localStream, setLocalStream] = useState<MediaStream | null>(null);

useEffect(() => {
  // Get stream from mediaManager when connected
  if (wsStatus === 'connected') {
    mediaManager.startStream().then(setLocalStream);
  }
}, [wsStatus]);

// In JSX
{localStream && (
  <LocalVideo
    stream={localStream}
    className="w-64 h-48"
  />
)}
```

## Acceptance Criteria
- [x] DeviceSelector uses LocalVideo component for preview
- [x] RoomPage displays LocalVideo when media stream is active
- [x] Video controls (mute/unmute) work correctly in both locations
- [x] No duplicate video rendering code
- [x] Existing tests pass

## Definition of Done
- All acceptance criteria satisfied
- No regression in DeviceSelector functionality
- Clean component composition
- Media stream properly managed

## Related Files
- `apps/client/src/features/media/components/device-selector.tsx` - Refactor to use LocalVideo
- `apps/client/src/routes/room.tsx` - Add LocalVideo integration
- `apps/client/src/components/local-video.tsx` - LocalVideo component
- `apps/client/src/lib/media/manager.ts` - MediaStreamManager

## Related Tasks
- TASK-023 — Media Stream Access (MediaStreamManager)
- TASK-002 — RTCPeerConnection Setup
