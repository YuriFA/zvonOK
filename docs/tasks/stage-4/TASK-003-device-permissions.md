# TASK-030 — Device Permissions Handling

## Status
planned

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

## Related Files
- `apps/client/src/hooks/use-local-media.ts`

## Next Task
TASK-031 — Chat Model
