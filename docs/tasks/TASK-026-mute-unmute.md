# TASK-026 — Media Controls (Mute/Unmute)

## Status
planned

## Priority
high

## Description
Implement media track controls for enabling/disabling camera and microphone without disrupting WebRTC connection.

## Scope
- Create useMediaControls hook
- Toggle video (camera on/off)
- Toggle audio (microphone on/off)
- Visual indication of mute states
- Sync state with other participants via Socket.io
- Display participant mute states

## Out of Scope
- Screen share (covered in TASK-027)
- Device switching (covered in Phase 5)

## Technical Design

### Media Control Hook
```typescript
export function useMediaControls(stream: MediaStream | null) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const toggleVideo = () => {
    track.enabled = !track.enabled;
  };

  const toggleAudio = () => {
    track.enabled = !track.enabled;
  };
}
```

### enabled vs stop
| Method | Track | Camera LED | Bandwidth |
|--------|-------|------------|-----------|
| `track.enabled = false` | Active | On | Reduced |
| `track.stop()` | Stopped | Off | No stream |

For mute: Use `enabled = false`

### State Synchronization
- Emit media_state_changed event on toggle
- Display remote participant mute states
- Show icons for audio/video off

## Acceptance Criteria
- Toggle video button works
- Toggle audio button works
- Local video shows "no signal" when camera off
- Button icons reflect current state
- State synced with participants
- Remote participant mute states visible

## Definition of Done
- Both toggle buttons functional
- Visual feedback for mute states
- State synchronization via WebSocket
- Remote mute indicators displayed
- No WebRTC disruption on toggle

## Implementation Guide
See: `docs/tasks/phase-03-webrtc-p2p/3.5-mute-unmute.md`

## Related Files
- `apps/client/src/hooks/use-media-controls.ts`
- `apps/client/src/components/media-controls.tsx`
- `apps/client/src/components/remote-video.tsx`

## Next Task
TASK-027 — Screen Share
