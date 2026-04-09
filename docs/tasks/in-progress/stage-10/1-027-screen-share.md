# TASK-027 — Screen Share

> **Status:** done
> **Priority:** medium
> **Created:** 2026-02-08

---

## Description
Implement screen sharing using getDisplayMedia API with track replacement via the SFU (mediasoup) pipeline.

## Scope
- Create `useScreenShare` hook
- Start screen share with `getDisplayMedia`
- Replace video track in SFU producer via `replaceTrack`
- Stop screen share and return to camera
- Handle system audio (optional, Chrome/Edge only)
- Expose `isSharing` state for UI consumption (used by TASK-080)

## Out of Scope
- Screen share button and UI states (covered in TASK-080)
- Device switching (covered in TASK-028 to TASK-030)

## Technical Design

### Screen Share Hook
```typescript
// apps/client/src/hooks/use-screen-share.ts
export function useScreenShare() {
  const { replaceTrack } = useMediasoup();
  const videoTrackProvider = useCaptureTrackProvider('video'); // from media-manager context
  const [isSharing, setIsSharing] = useState(false);

  const startScreenShare = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false,
    });

    const screenTrack = stream.getVideoTracks()[0];

    // Replace video producer track in SFU — no renegotiation needed
    await replaceTrack('video', screenTrack);
    setIsSharing(true);

    // Stop screen share when user clicks the browser's built-in "Stop sharing" button
    screenTrack.addEventListener('ended', () => stopScreenShare(), { once: true });
  };

  const stopScreenShare = async () => {
    const cameraTrack = videoTrackProvider.getTrack(); // ICaptureTrackProvider.getTrack()
    await replaceTrack('video', cameraTrack ?? null);
    setIsSharing(false);
  };

  return { startScreenShare, stopScreenShare, isSharing };
}
```

### Key API Corrections

**Getting the current camera track:**
`useMediaManager` does not exist. Use `useCaptureTrackProvider` from the media manager context:
```typescript
import { useCaptureTrackProvider } from '@/features/media/contexts/media-manager.context';
// ...
const videoTrackProvider = useCaptureTrackProvider('video');
const cameraTrack = videoTrackProvider.getTrack(); // returns MediaStreamTrack | null
```

**`replaceTrack` availability:**
`replaceTrack` is exposed directly by `useMediasoup()` and does NOT need to be threaded through `useRoomSfu` / `useRoomSession`. Call `useMediasoup()` directly inside the hook.

### SFU Integration
- `replaceTrack('video', track)` is exposed by `useMediasoup()` (`apps/client/src/hooks/use-mediasoup.ts:37`)
- Internally calls `SfuManager.replaceTrack(kind, newTrack)` (`apps/client/src/lib/sfu/manager.ts:280`)
- `replaceTrack` does not interrupt the transport connection — only the media source changes
- No SFU renegotiation required

### Browser Support
| Browser | Video | Audio (System) |
|---------|-------|----------------|
| Chrome/Edge | ✅ | ✅ (with flag) |
| Firefox | ✅ | ❌ |
| Safari | ✅ | ❌ |

## Acceptance Criteria
- [ ] `startScreenShare` requests display media and replaces SFU video track
- [ ] Remote participant sees screen after track replacement
- [ ] `stopScreenShare` restores camera track in SFU
- [ ] `track.ended` event triggers auto-stop
- [ ] `isSharing` reflects current state correctly
- [ ] `NotAllowedError` (user cancelled) is caught and does not change state
- [ ] `NotSupportedError` (browser) is caught and surfaced

## Definition of Done
- `useScreenShare` hook created and functional
- Track replacement working via SFU pipeline
- Proper cleanup on stop (camera track restored via `useCaptureTrackProvider`)
- `isSharing` state exposed for TASK-080 UI consumption
- Works in group calls (SFU)

## Implementation Guide
1. Create `apps/client/src/hooks/use-screen-share.ts` using the corrected design above
2. Import `useCaptureTrackProvider` from `@/features/media/contexts/media-manager.context` — **not** `useMediaManager`
3. Call `useMediasoup()` directly for `replaceTrack` — no changes to `useRoomSession` needed
4. Handle `NotAllowedError` (user cancelled) and `NotSupportedError` (browser) in `startScreenShare`
5. Use `useState<boolean>` for `isSharing`; export it for TASK-080 to consume

## Related Files
- `apps/client/src/hooks/use-screen-share.ts` — hook to create
- `apps/client/src/hooks/use-mediasoup.ts` — provides `replaceTrack` (line 37)
- `apps/client/src/lib/sfu/manager.ts` — `SfuManager.replaceTrack` implementation (line 280)
- `apps/client/src/features/media/contexts/media-manager.context.tsx` — provides `useCaptureTrackProvider`
- `apps/client/src/lib/media/interfaces.ts` — `ICaptureTrackProvider.getTrack()` interface (line 44)
