# TASK-030 — Device Permissions Handling

## Status
completed

## Priority
medium

## Description
Handle media device permissions with graceful degradation when cameras or microphones are unavailable.

## Scope
- Check for available devices
- Request permissions with clear UI
- Handle permission denied
- Audio-only fallback
- Retry logic for temporary failures
- User notifications for permission issues

## Technical Design

### Permission Check
```typescript
const checkPermissions = async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const hasVideo = devices.some(d => d.kind === 'videoinput');
  const hasAudio = devices.some(d => d.kind === 'audioinput');
  return { hasVideo, hasAudio };
};
```

### Graceful Degradation
```typescript
const initializeMedia = async () => {
  try {
    return await getUserMedia({ video: true, audio: true });
  } catch {
    try {
      const stream = await getUserMedia({ video: false, audio: true });
      showNotification('Camera unavailable. Audio-only mode.');
      return stream;
    } catch {
      throw new Error('No media devices available');
    }
  }
};
```

## Acceptance Criteria
- Permissions checked before join
- Clear UI for permission requests
- Audio-only mode works without camera
- Retry logic for temporary failures
- User notifications for issues

## Definition of Done
- Permission flow user-friendly
- All error cases handled
- Audio-only fallback functional
- Clear error messages

## Implementation Guide

### Files Created/Modified

1. **`apps/client/src/lib/media/manager.ts`**
   - Added `startStream()` - starts media with graceful degradation
   - Added `checkPermissions()` - checks available devices and permission states
   - Added `isAudioOnly()` - checks if running in audio-only mode
   - Added `getVideoUnavailableReason()` - gets reason for video unavailability
   - Added `MediaPermissionStatus` and `StartStreamResult` types

2. **`apps/client/src/features/media/hooks/use-media-permissions.ts`** (new)
   - `useMediaPermissions()` hook for permission handling in React components
   - `checkPermissions()` - check permission status
   - `startMedia()` - start media with fallback
   - `stopMedia()` - stop media stream
   - `retry(maxRetries)` - retry with exponential backoff

3. **`apps/client/src/routes/room.tsx`**
   - Updated to use `startStream()` for graceful degradation
   - Added audio-only mode warning banner with `VideoOff` icon
   - Shows video unavailable reason when in audio-only mode

### Usage Example

```tsx
import { useMediaPermissions } from '@/features/media/hooks';

function MediaSetup() {
  const {
    permissionStatus,
    startMedia,
    isAudioOnly,
    videoUnavailableReason,
    error,
    retry,
  } = useMediaPermissions();

  const handleStart = async () => {
    try {
      const result = await startMedia();
      if (result.isAudioOnly) {
        console.log('Running in audio-only mode:', result.videoError);
      }
    } catch (err) {
      // Handle error
    }
  };

  const handleRetry = async () => {
    const result = await retry(3); // Retry up to 3 times
    if (!result) {
      // All retries failed
    }
  };
}
```

## Related Files
- `apps/client/src/lib/media/manager.ts`
- `apps/client/src/features/media/hooks/use-media-permissions.ts`
- `apps/client/src/routes/room.tsx`

## Next Task
TASK-031 — Device Selector UI
