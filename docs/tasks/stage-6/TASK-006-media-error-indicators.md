# TASK-066 — Media Error Indicators on Controls

## Status
planned

## Priority
medium

## Description
Currently, when camera or microphone is not found or has an error, text badges are displayed at the top of the page. Instead, these errors should be shown as warning/error icons with tooltips directly on the camera and microphone toggle buttons in the MediaControls component.

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
Text badges displayed in room.tsx:
```tsx
{/* Media access error */}
{mediaError && (
  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
    Camera/microphone unavailable: {mediaError}
  </div>
)}

{/* Audio-only mode warning */}
{isAudioOnly && !mediaError && (
  <div className="rounded-md bg-yellow-500/15 p-3 text-sm text-yellow-600">
    {videoUnavailableReason || 'Camera unavailable'}. Running in audio-only mode.
  </div>
)}
```

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
// In room.tsx or use-media-controls hook
const [videoError, setVideoError] = useState<'no-device' | 'permission-denied' | 'error' | null>(null);
const [audioError, setAudioError] = useState<'no-device' | 'permission-denied' | 'error' | null>(null);

// Set errors based on media manager state
useEffect(() => {
  const reason = mediaManager.getVideoUnavailableReason();
  if (reason?.includes('permission')) {
    setVideoError('permission-denied');
  } else if (reason?.includes('not found') || reason?.includes('No camera')) {
    setVideoError('no-device');
  } else if (reason) {
    setVideoError('error');
  }
}, [/* dependencies */]);
```

### Retry Behavior
- Error-state buttons stay clickable
- Clicking the camera or microphone button retries acquisition for that media kind
- If the retry succeeds, the error indicator clears and the control returns to its normal icon state
- If the retry fails, tooltip text should help the user understand whether they need to grant permission or reconnect a device

### UI States

| State | Icon | Color | Tooltip |
|-------|------|-------|---------|
| Working, on | Video | default | "Turn off camera" |
| Working, off | VideoOff | default | "Turn on camera" |
| No device | AlertTriangle | warning | "No camera found" |
| Permission denied | AlertTriangle | destructive | "Camera permission denied" |
| Other error | AlertTriangle | destructive | "Camera unavailable" |

## Acceptance Criteria
- [ ] No text badges at top of page for media errors
- [ ] Warning icon shown on camera button when no camera found
- [ ] Error icon shown on button when permission denied
- [ ] Tooltip explains the specific error
- [ ] Both camera and microphone buttons support error states
- [ ] Error state buttons remain interactive and can trigger a retry
- [ ] Clear visual distinction between warning and error states

## Definition of Done
- Text badges removed from room page
- Error indicators integrated into MediaControls
- Tooltips implemented with clear error messages
- Retry behavior works without leaving the room screen
- Accessible (screen reader friendly)
- Manual testing with various error scenarios

## Related Files
- `apps/client/src/features/media/components/media-controls.tsx`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/lib/media/manager.ts`

## Related Tasks
- TASK-064 — Fix Missing Participant Without Media
- TASK-065 — Proper Camera Toggle Implementation

## Next Task
TASK-067 — Call Ended State
