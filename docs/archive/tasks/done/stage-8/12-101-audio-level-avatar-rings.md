# TASK-101 — Audio Level Indicator: Concentric Rings Around Avatar

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-30

---

## Description

Add a real-time audio level indicator displayed as concentric rings around the avatar circle (initials) when the user's video is disabled. The rings expand outward from the avatar and their count, size, and opacity scale with the participant's audio volume. When the participant is silent, no rings are shown. The effect should animate smoothly.

Applies to **all** participants — local user and remote peers.

## Scope

- Extract `calculateRmsLevel` to shared utility
- Create `use-audio-level` hook for per-participant audio level sampling
- Create `AudioLevelRings` React component (concentric ring animation)
- Create `useParticipantAudioLevels` hook for all participants
- Modify `RemoteVideo` to render `AudioLevelRings` around the avatar when video is off
- Modify `ActiveRoomView` to pass audio levels down to `RemoteVideo`

## Technical Design

### 1. Extract: `calculateRmsLevel` utility

Location: `apps/client/src/lib/audio/audio-utils.ts`

```
export function calculateRmsLevel(analyser: AnalyserNode): number
```

Same logic as `use-active-speaker.ts:calculateLevel` (lines 67-78). Used by both the new hook and optionally refactor `use-active-speaker` to use it.

### 2. `use-audio-level` hook

Location: `apps/client/src/features/media/hooks/use-audio-level.ts`

```
function useAudioLevel(options: {
  analyser: AnalyserNode | null;
  interval?: number;       // default 100ms
  smoothFactor?: number;   // default 0.3
}): number  // returns 0..1 smoothed level
```

- Uses `setInterval` to sample `getByteTimeDomainData` via `calculateRmsLevel`
- Applies exponential smoothing
- Returns `0` when `analyser` is `null`
- Cleans up interval on unmount / when analyser changes

### 3. `AudioLevelRings` component

Location: `apps/client/src/components/audio-level-rings.tsx`

```
interface AudioLevelRingsProps {
  level: number;            // 0..1
  color: string;            // CSS color (from getAvatarColor)
  maxRings?: number;        // default 4
  baseRadius?: number;      // default 32 (half of avatar 64px)
  className?: string;
}
```

**Visual design:**

- Positioned behind the avatar circle (lower z-index)
- Renders 0–`maxRings` concentric ring elements
- Each ring is a `<div>` with `border-radius: 50%`, `border: 2px solid <color>`, transparent fill
- Ring `i` (0-based):
  - `radius = baseRadius + (i + 1) * spacing * (1 + level * 0.5)`
  - `opacity = clamp(1 - i / maxRings, 0.1, 1) * level`
  - `borderWidth = 1 + level * 2` (thicker when louder)
- Color: same hue as avatar but lighter/brighter (use `color-mix()` or helper to lighten by ~20-30%)
- CSS `transition: all 150ms ease-out` on opacity and transform
- When `level < threshold` (~0.01): render nothing
- Use `transform: scale()` + `opacity` for GPU-accelerated animation
- `will-change: transform, opacity`

### 4. `useParticipantAudioLevels` hook

Location: `apps/client/src/features/room/hooks/use-participant-audio-levels.ts`

```
function useParticipantAudioLevels(options: {
  remotePeers: RemotePeerMedia[];
  localAudioStream: MediaStream | null;
  localUserId: string;
  mixer: IRemoteAudioMixer | null;
  enabled?: boolean;
}): Map<string, number>
```

- For remote peers: uses `mixer.getAnalyser(userId)` (reuses existing mixer analysers)
- For local user: creates its own `AnalyserNode` from `localAudioStream`
- Returns `Map<userId, level>` updated every ~100ms
- Cleans up local analyser on unmount

### 5. Modified: `RemoteVideo`

File: `apps/client/src/components/remote-video.tsx`

- Add `audioLevel?: number` prop (0..1)
- When `!isVideoEnabled && audioLevel > threshold`: render `<AudioLevelRings>` behind avatar
- Pass `color` from `getAvatarColor(username)` and `level` from prop

### 6. Modified: `ActiveRoomView`

File: `apps/client/src/features/room/components/active-room-view.tsx`

- Call `useParticipantAudioLevels({ remotePeers, localAudioStream, localUserId, mixer, enabled: isConnected })`
- Pass `audioLevel={audioLevels.get(userId) ?? 0}` to each `<RemoteVideo>`

## Implementation Steps

1. Extract `calculateRmsLevel` to `apps/client/src/lib/audio/audio-utils.ts`
2. Refactor `use-active-speaker.ts` to use `calculateRmsLevel`
3. Create `use-audio-level` hook
4. Create `AudioLevelRings` component
5. Create `useParticipantAudioLevels` hook
6. Add `audioLevel` prop to `RemoteVideoProps`, render `<AudioLevelRings>`
7. Integrate `useParticipantAudioLevels` in `ActiveRoomView`
8. Test: silent → no rings, speaking → rings animate, volume → ring count/size changes

## Acceptance Criteria

- [ ] Concentric rings appear around avatar when video is off and user is speaking
- [ ] Ring count and size increase with audio volume
- [ ] Ring color is a brighter shade of the avatar color
- [ ] Rings disappear smoothly when user stops speaking
- [ ] No rings when silent or mic muted
- [ ] Works for local user and all remote peers
- [ ] Smooth animation (GPU-accelerated transforms)
- [ ] `calculateRmsLevel` extracted to shared utility
- [ ] No duplicate AudioContext/AnalyserNode — reuses mixer analysers for remote peers
- [ ] Existing tests pass
- [ ] New hooks have unit tests

## Related Files

- `apps/client/src/components/remote-video.tsx`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/hooks/use-active-speaker.ts`
- `apps/client/src/features/room/hooks/use-room-session.ts`
- `apps/client/src/lib/audio/remote-audio-mixer.ts`
- `apps/client/src/lib/utils/display-name.ts`
