# TASK-006 — Media Error Indicators on Controls

## Status
completed

## Priority
medium

## Description
When camera or microphone is not found or has an error, should be shown as warning/error icons with tooltips directly on the camera and microphone toggle buttons in the MediaControls component.

## Scope
- Remove text badges from top of room page for media errors
- Add warning/error icon indicators to MediaControls buttons
- Implement tooltips explaining the error state
- Differentiate between "no device" and "permission denied" states
- Keep controls interactive so the user can retry from the same place

## Out of Scope
- Changes to media acquisition logic
- Audio-only mode handling
- Device settings panel changes

## Technical Design

### Current Implementation
Text badges displayed in room-alerts.tsx:
```tsx
{mediaError && (
  <div className="container mx-auto px-4 py-4">
    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
      Camera/microphone unavailable: {mediaError}
    </div>
  </div>
)}
```

The `mediaError` comes from `useRoomSession`, which exposes `useMediaStreamContext().error` as a `string | null`.

### Proposed Implementation

#### MediaControls Props Extension
```typescript
interface MediaControlsProps {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  // New props for error states
  videoError?: 'no-device' | 'permission-denied' | 'error' | null;
  audioError?: 'no-device' | 'permission-denied' | 'error' | null;
  // ...
}
```

#### Button with Error Indicator
```tsx
<Button
  variant={videoError ? 'destructive' : variant}
  size={size}
  onClick={onToggleVideo}
>
  {videoError ? (
    <AlertTriangle className="size-4" />
  ) : isVideoEnabled ? (
    <Video className="size-4" />
  ) : (
    <VideoOff className="size-4" />
  )}
  <Tooltip>
    {videoError === 'no-device' && 'No camera found'}
    {videoError === 'permission-denied' && 'Camera permission denied'}
    {videoError === 'error' && 'Camera error'}
  </Tooltip>
</Button>
```

### State Management
```typescript
// In a new use-media-errors.ts hook
type MediaErrorType = 'no-device' | 'permission-denied' | 'error' | null;

function classifyMediaError(error: string | null): MediaErrorType {
  if (!error) return null;
  const lower = error.toLowerCase();
  if (lower.includes('permission') || lower.includes('not allowed')) {
    return 'permission-denied';
  }
  if (lower.includes('not found') || lower.includes('no camera') || lower.includes('no microphone')) {
    return 'no-device';
  }
  return 'error';
}
```

Two sources of truth are required for per-button error state:

1. **`error` from `useMediaStreamContext()`** — a raw string from a failed `getUserMedia` call.
   Use `classifyMediaError` to get the error type.
   Note: `MediaAcquisition` already applies internal fallback strategies
   (`PermissionDeniedStrategy`, `DeviceNotFoundStrategy`) before throwing — so `error` may be
   `null` even if the acquisition degraded to audio-only.

2. **`isVideoAvailable` / `isAudioAvailable` from `useMediaControls()`** — reflect whether
   the manager actually has a live track of that kind.
   These are the primary signal for the "no device" indicator, since acquisition may succeed
   without a video track (fallback to audio-only) without setting `error`.

Combining both:
```typescript
// derive per-button error
const streamError = classifyMediaError(mediaError); // from MediaStreamContext

const videoError: MediaErrorType =
  !isVideoAvailable && streamError ? streamError :
  !isVideoAvailable ? 'no-device' :
  null;

const audioError: MediaErrorType =
  !isAudioAvailable && streamError ? streamError :
  !isAudioAvailable ? 'no-device' :
  null;
```

### Retry Behavior
- Error-state buttons stay clickable (never `disabled`)
- Clicking the button calls the existing `onToggleVideo` / `onToggleAudio` handler — no new retry logic needed
- `MediaAcquisition.start()` can be called again after a failure (stream is null, pendingPromise is cleared); the existing fallback strategies inside acquisition will run
- If the underlying track becomes available, `isVideoAvailable` / `isAudioAvailable` update via the manager's event subscriptions and the error indicator clears automatically
- Tooltip text guides the user on what action is needed (grant permission / reconnect device)

### UI States

| State | Icon | Button Variant | Tooltip |
|-------|------|----------------|---------|
| Working, on | Video | secondary | "Turn off camera" |
| Working, off | VideoOff | secondary | "Turn on camera" |
| No device | AlertTriangle | secondary (yellow icon) | "No camera found" |
| Permission denied | AlertTriangle | destructive | "Camera permission denied" |
| Other error | AlertTriangle | destructive | "Camera unavailable" |

Note: Button doesn't have a `warning` variant. Use `secondary` with yellow text/icon for "no device" warning state.

### Tooltip Component
Add Tooltip component from shadcn/ui:
```bash
pnpm -C apps/client dlx shadcn@latest add tooltip
```

## Acceptance Criteria
- [x] No text badges at top of page for media errors (remove from RoomAlerts)
- [x] Warning icon (AlertTriangle with yellow color) shown on camera button when no camera found
- [x] Error icon (AlertTriangle) shown on button when permission denied (destructive variant)
- [x] Tooltip explains the specific error
- [x] Both camera and microphone buttons support error states
- [x] Error state buttons remain interactive (not disabled) and call the existing toggle handler
- [x] Visual distinction: secondary + yellow icon for "no device", destructive for permission/error

## Definition of Done
- [x] Tooltip component added from shadcn/ui
- [x] Text badges removed from RoomAlerts (mediaError handling)
- [x] Error indicators integrated into MediaControls
- [x] Tooltips implemented with clear error messages
- [x] Error indicators clear automatically when `isVideoAvailable` / `isAudioAvailable` become true (no manual reset needed)
- [x] Accessible (screen reader friendly via aria-label)
- [ ] Manual testing with various error scenarios

## Related Files
- `apps/client/src/features/media/components/media-controls.tsx`
- `apps/client/src/features/room/components/room-alerts.tsx`
- `apps/client/src/features/room/components/room-view.tsx`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/features/media/contexts/media-stream.context.tsx`
- `apps/client/src/lib/media/acquisition.ts` (error types: NotAllowedError, NotFoundError)

## Related Tasks
- TASK-004 — Peer Without Media
- TASK-005 — Camera Toggle

## Next Task
TASK-007 — Call Ended State
