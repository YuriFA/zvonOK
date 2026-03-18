# TASK-069 — Permission Denied Warning & Re-Request Modal

## Status
done

## Priority
medium

## Description
When the user has denied browser access to camera and/or microphone, entering the call should display a persistent warning icon in the top-right corner of the room view. When the user clicks a toggle button for a denied device, instead of silently failing, a modal dialog should appear explaining the issue and offering buttons to re-request access to the specific device or to both devices at once.

## Scope
- Detect permission-denied state for camera and microphone on call entry
- Show a persistent warning indicator (icon) in the top-right corner of the room header when one or both devices are denied
- Tooltip on the warning icon lists which devices are currently blocked
- Intercept toggle button clicks for denied devices and show a modal instead of attempting to start the track
- Modal content dynamically adapts to which devices are denied:
  - If only the toggled device is denied: show one button to request access to that device
  - If both devices are denied: show two buttons — one for the specific device, one for both
- Clicking a request button in the modal calls `navigator.mediaDevices.getUserMedia()` for the appropriate constraints
- On successful permission grant: close modal, update permission state, re-enable the device
- On permission denial (user clicks "Block" again): close modal, keep error state, show a toast or inline message explaining the user must change browser settings manually
- Warning icon disappears when all denied permissions are resolved

## Out of Scope
- Changes to the pre-join permission flow
- Guiding the user through browser settings (site settings page)
- Persisting permission state across browser restarts
- Changes to the existing `PermissionDeniedStrategy` fallback logic in `MediaAcquisition`
- Audio-only mode redesign

## Technical Design

### Permission State Detection

Extend the existing `useMediaPermissions` hook or create a new `usePermissionState` hook that uses the Permissions API to reactively track camera and microphone permission state:

```typescript
// features/media/hooks/use-permission-state.ts

type DevicePermission = 'granted' | 'denied' | 'prompt';

interface PermissionStateResult {
  cameraPermission: DevicePermission;
  microphonePermission: DevicePermission;
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
  isAnyDenied: boolean;
  /** Re-request access; resolves to true on grant, false on deny */
  requestPermission: (kind: 'camera' | 'microphone' | 'both') => Promise<boolean>;
}
```

Use `navigator.permissions.query({ name: 'camera' })` and `navigator.permissions.query({ name: 'microphone' })` with `permissionStatus.onchange` listeners to keep the state reactive without polling.

### Warning Indicator Component

```typescript
// features/room/components/permission-warning-indicator.tsx

interface PermissionWarningIndicatorProps {
  isCameraDenied: boolean;
  isMicrophoneDenied: boolean;
}
```

- Renders in `RoomHeader` in the top-right area (before the device settings / end call buttons)
- Icon: `AlertTriangle` from lucide-react with yellow/amber color
- Wrapped in a `Tooltip` that lists blocked devices:
  - "Camera access blocked" / "Microphone access blocked" / "Camera and microphone access blocked"
- The indicator is only visible when at least one device is denied
- Clicking the indicator opens the same permission request modal

### Permission Request Modal

```typescript
// features/media/components/permission-request-modal.tsx

interface PermissionRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deniedDevices: {
    camera: boolean;
    microphone: boolean;
  };
  onRequestPermission: (kind: 'camera' | 'microphone' | 'both') => Promise<boolean>;
}
```

Uses the existing `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` primitives from `apps/client/src/components/ui/dialog.tsx`. Add `DialogDescription` and `DialogFooter` exports to the dialog primitive if not yet present.

#### Modal Content Variants

**Single device denied (e.g. only camera):**
```
  [AlertTriangle icon]

  Camera Access Required

  Your browser is blocking access to the camera.
  To use this device, you need to grant permission.

  [ Allow Camera Access ]
```

**Both devices denied:**
```
  [AlertTriangle icon]

  Device Access Required

  Your browser is blocking access to the camera and microphone.
  To use these devices, you need to grant permission.

  [ Allow Camera Access ]
  [ Allow Microphone Access ]
  [ Allow Both ]
```

**After browser-level block (second deny):**
If `getUserMedia` throws `NotAllowedError` from the modal request, the modal should show an inline message:

```
  Permission was denied again. You may need to update your
  browser's site settings to allow access to this device.
```

### Toggle Button Interception

Modify the toggle handler logic in `active-room-view.tsx` (or the consuming component) so that clicking a toggle for a denied device opens the modal instead of calling the manager:

```typescript
// In the component that wires up media controls
const handleToggleVideo = () => {
  if (isCameraDenied && !controls.isVideoEnabled) {
    // User is trying to enable a denied device — show modal
    setPermissionModalOpen(true);
    setPermissionModalTarget('camera');
    return;
  }
  controls.setVideoEnabled(!controls.isVideoEnabled);
};

const handleToggleAudio = () => {
  if (isMicrophoneDenied && !controls.isAudioEnabled) {
    setPermissionModalOpen(true);
    setPermissionModalTarget('microphone');
    return;
  }
  controls.setAudioEnabled(!controls.isAudioEnabled);
};
```

### Permission Re-Request Flow

```typescript
// Inside the permission hook
const requestPermission = async (
  kind: 'camera' | 'microphone' | 'both',
): Promise<boolean> => {
  const constraints: MediaStreamConstraints = {
    video: kind === 'microphone' ? false : true,
    audio: kind === 'camera' ? false : true,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Stop the temporary stream — tracks will be re-acquired by the manager
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
};
```

On success (`true`):
1. Close the modal
2. The Permissions API `onchange` listener updates reactive permission state
3. Warning indicator disappears if all permissions are now granted
4. Call the original toggle action to enable the device through the manager

On failure (`false`):
1. Show inline error message in the modal body
2. Keep modal open so the user can read the guidance
3. Permission state remains `denied`

### Integration Points

| Component | Change |
|-----------|--------|
| `room-header.tsx` | Add `PermissionWarningIndicator` in the `'active'` variant header, top-right area |
| `active-room-view.tsx` | Wire permission state into toggle handlers; manage modal open state |
| `media-controls.tsx` | No changes needed — existing `videoError` / `audioError` props and destructive variant already handle the visual error state on buttons |
| `dialog.tsx` | Add `DialogDescription` and `DialogFooter` exports if missing |
| `use-media-errors.ts` | No changes needed — existing classification already handles `'permission-denied'` |

### State Flow Diagram

```
User enters room with denied permission
  -> Permissions API query detects 'denied'
  -> Warning indicator appears in header
  -> Media controls show destructive error state (existing TASK-006 behavior)

User clicks denied device toggle button
  -> Intercept: open PermissionRequestModal
  -> User clicks "Allow [Device] Access"
    -> getUserMedia() called
      -> Success: close modal, enable device, warning clears
      -> Fail: show inline guidance in modal
```

## Acceptance Criteria
- [ ] Warning icon (AlertTriangle, amber) visible in top-right of room header when camera and/or microphone permission is denied
- [ ] Warning icon tooltip lists which devices are blocked
- [ ] Clicking warning icon opens the permission request modal
- [ ] Clicking toggle button for a denied device opens the modal instead of silently failing
- [ ] Modal shows one device button when only the toggled device is denied
- [ ] Modal shows per-device buttons and an "Allow Both" button when both devices are denied
- [ ] Clicking a permission button in the modal triggers a `getUserMedia` call with the correct constraints
- [ ] On successful permission grant: modal closes, device enables, warning icon disappears (if all resolved)
- [ ] On repeated denial: modal shows inline message about browser site settings
- [ ] Warning indicator and modal do not appear when permissions are granted
- [ ] Existing media error indicators on toggle buttons (TASK-006) continue to work unchanged
- [ ] Permission state updates reactively via Permissions API `onchange` (no polling)

## Definition of Done
- Permission detection hook implemented with reactive Permissions API listeners
- Warning indicator component renders in room header with tooltip
- Modal component adapts to single/both denied device scenarios
- Toggle interception prevents silent failures for denied devices
- Re-request flow handles both grant and repeated denial gracefully
- Dialog primitive extended with `DialogDescription` / `DialogFooter` if needed
- Accessible: modal has proper focus management (handled by Radix Dialog), warning icon has `aria-label`
- Manual testing with all permission combinations (both denied, only camera denied, only mic denied, both granted)

## Related Files
- `apps/client/src/features/room/components/room-header.tsx`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/media/components/media-controls.tsx`
- `apps/client/src/features/media/hooks/use-media-errors.ts`
- `apps/client/src/features/media/hooks/use-media-controls.ts`
- `apps/client/src/features/media/hooks/use-media-permissions.ts`
- `apps/client/src/lib/media/permissions.ts`
- `apps/client/src/lib/media/types.ts`
- `apps/client/src/components/ui/dialog.tsx`
- `apps/client/src/features/room/components/room-alerts.tsx`

## Related Tasks
- TASK-066 — Media Error Indicators on Controls (provides the button-level error states this task builds on)
- TASK-065 — Proper Camera Toggle Implementation (toggle handler wiring)
- TASK-064 — Fix Missing Participant Without Media (peer visibility without tracks)
- TASK-030 — Device Permissions Handling (original permission flow)
- TASK-063 — Pre-Join State Before Call Connection (room entry flow)

## Next Task
(none — end of stage-6 additions)
