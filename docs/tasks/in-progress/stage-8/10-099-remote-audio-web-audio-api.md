# TASK-099 — Remote Audio via Web Audio API

> **Status:** planned
> **Priority:** medium
> **Created:** 2026-03-28

---

## Description

Replace per-peer audio playback through `<video autoPlay>` with a single `AudioContext`-based mixer. This provides a unified audio output point for `setSinkId` (speaker switching), eliminates the "primary element only" limitation, and enables future per-peer volume control.

## Motivation

Currently each remote peer's audio plays through its own `<video>` element. `setSinkId` is only applied to the first (`primary`) element — other peers use the system default output. A Web Audio API mixer routes all remote audio through a single `MediaStreamAudioDestinationNode` → one `<audio>` element → one `setSinkId` for all participants.

## Scope

- Create `RemoteAudioMixer` class (framework-agnostic, no React deps)
- Create React hook `useRemoteAudio` to integrate mixer with remote peer state
- Mute `<video>` elements — audio now plays through the mixer
- Integrate with `use-active-speaker` (reuse analyser nodes from mixer)
- Update `DeviceSettingsPanel` and `use-device-switching` — single audio element
- Remove `primaryRemoteMediaElement` plumbing
- Clean up `use-remote-media-elements` (keep only if needed for video refs)

## Technical Design

### Architecture

```
RemotePeer streams (audio tracks)
        │
        ▼
┌─ RemoteAudioMixer ─────────────────────────┐
│  AudioContext (singleton)                    │
│                                              │
│  per peer:                                   │
│    MediaStreamAudioSourceNode ──┐            │
│    GainNode (default 1.0) ──────┤            │
│    AnalyserNode (for speaker) ──┤            │
│                                │            │
│  MediaStreamAudioDestinationNode ◄───────────┘
│    └── stream ──► hidden <audio autoPlay>    │
│                    └── setSinkId(deviceId)   │
└──────────────────────────────────────────────┘
```

### New: `IRemoteAudioMixer` interface + `RemoteAudioMixer` class

Location: `apps/client/src/lib/audio/remote-audio-mixer.ts`

Framework-agnostic. No React imports.

Interface extracted for DIP (hooks depend on `IRemoteAudioMixer`, not concrete class) and testability.

```
interface IRemoteAudioMixer {
  addPeer(userId: string, audioTrack: MediaStreamTrack): void
  removePeer(userId: string): void
  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void
  setSink(deviceId: string): Promise<boolean>
  setGain(userId: string, value: number): void
  getAnalyser(userId: string): AnalyserNode | undefined
  getAudioElement(): HTMLAudioElement
  destroy(): void
}

class RemoteAudioMixer implements IRemoteAudioMixer {
  private ctx: AudioContext
  private peers: Map<string, { source, gain, analyser }>
  private destination: MediaStreamAudioDestinationNode
  private audioElement: HTMLAudioElement

  constructor()
  addPeer(userId: string, audioTrack: MediaStreamTrack): void
  removePeer(userId: string): void
  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void
  setSink(deviceId: string): Promise<boolean>
  setGain(userId: string, value: number): void
  getAnalyser(userId: string): AnalyserNode | undefined
  getAudioElement(): HTMLAudioElement
  destroy(): void
}
```

- `addPeer` — creates `source` → `gain` → `analyser` → `destination` chain
- `removePeer` — disconnects nodes, cleans up
- `updatePeerTrack` — disconnects old source nodes for given peer, creates new chain with updated track (handles renegotiation / track replacement)
- `setSink` — calls `setSinkId` on the single `audioElement`; returns `false` gracefully if browser doesn't support it
- `setGain` — per-peer volume (0..1), ready for future UI
- `getAnalyser` — returns analyser for active-speaker detection (remote peers only)
- `getAudioElement` — returns the hidden `<audio>` element for prop passing
- `destroy` — disconnects all nodes, closes `AudioContext`, removes `audioElement`

#### Browser compatibility

- Audio output works in **all browsers** — sound plays via `<audio autoPlay>` → system default speaker
- `setSinkId` (speaker switching) only works in Chromium browsers; feature detection (`'setSinkId' in HTMLMediaElement.prototype`) is already in `use-device-switching.ts`
- No special fallback needed — mixer is always active, `setSinkId` is a progressive enhancement

#### AudioContext autoplay policy

- Constructor calls `ctx.resume()` to handle browsers that suspend `AudioContext` without user gesture
- If `ctx.state` is `'suspended'` after construction, consumers should call `ctx.resume()` on user interaction (same pattern as current `use-active-speaker.ts`)

### New: `useRemoteAudio` hook

Location: `apps/client/src/hooks/use-remote-audio.ts`

- Takes `remotePeers: RemotePeerMedia[]`
- Stores `RemoteAudioMixer` instance in `useRef` for stability across re-renders
- Depends on `IRemoteAudioMixer` interface (not concrete class)
- On mount: creates `RemoteAudioMixer` instance
- On peer add: extracts audio tracks, calls `mixer.addPeer()`
- On peer remove: calls `mixer.removePeer()`
- On peer track change: calls `mixer.updatePeerTrack()`
- On unmount: calls `mixer.destroy()`
- Returns `{ audioElement, mixer }` (or just expose what's needed)
- **Decide:** expose via React context or prop drilling (to be decided at implementation time)

### New: `RemoteAudio` component

Location: `apps/client/src/components/remote-audio.tsx`

Simple component that renders a hidden `<audio autoPlay>` element and binds `srcObject` from the mixer's output stream.

```
function RemoteAudio({ mixer }: { mixer: IRemoteAudioMixer }): JSX.Element
```

- Renders `<audio autoPlay style={{ display: 'none' }}>` with `srcObject` from `mixer.getAudioElement()`
- Rendered once in `active-room-view.tsx`, alongside video tiles

### Modified: `remote-video.tsx`

- Add `muted` attribute to `<video>` — audio no longer plays here
- Remove `onMediaElement` callback (or keep only for video-specific needs)

### Modified: `remote-video-tile.tsx`

- Remove `onMediaElement` prop bridging (no longer needed — audio goes through mixer)

### Modified: `use-active-speaker.ts`

- **Remote peers:** instead of creating its own `AudioContext` per peer, get `AnalyserNode` from `RemoteAudioMixer.getAnalyser(userId)` — removes duplicate AudioContext creation
- **Local user:** keeps its own separate `AudioContext` + `AnalyserNode` (not routed through mixer) — the mixer handles remote audio only
- Remove per-remote-peer `AudioContext` creation and silent gain workaround

### Modified: `use-device-switching.ts`

- `switchSpeakerDevice` — accepts single `HTMLAudioElement` (from mixer) instead of per-element
- Remove `remoteVideoElement` param

### Modified: `device-settings-panel.tsx`

- Replace `remoteVideoElement` prop with `audioElement` prop (from mixer)
- Simplify speaker switching — always has an element

### Modified: `room-header.tsx`

- Remove `primaryRemoteMediaElement` from `RoomHeaderActiveProps`
- Pass `audioElement` instead (from context or session hook)

### Modified: `room-view.tsx`

- Remove `primaryRemoteMediaElement={session.primaryRemoteMediaElement}` from `RoomHeader`
- Pass `audioElement` from mixer instead

### Modified/Cleaned: `use-remote-media-elements.ts`

- Evaluate if still needed (was only used for `primaryRemoteMediaElement`)
- If no video-specific refs needed — delete
- If needed — simplify to store only video refs

## Implementation Steps

1. Create `IRemoteAudioMixer` interface and `RemoteAudioMixer` class with unit tests
2. Create `useRemoteAudio` hook (stores mixer in `useRef`, depends on `IRemoteAudioMixer`)
3. Create `RemoteAudio` component (hidden `<audio autoPlay>` bound to mixer output)
4. Integrate into `active-room-view.tsx` — render `<RemoteAudio>` alongside video tiles
5. Add `muted` to `<video>` in `remote-video.tsx`, remove `onMediaElement`
6. Remove `onMediaElement` from `remote-video-tile.tsx`
7. Update `use-active-speaker.ts` — remote analysers from mixer, keep local analyser separate
8. Update `use-device-switching.ts` — single audio element API
9. Update `device-settings-panel.tsx` — `audioElement` prop instead of `remoteVideoElement`
10. Clean up `room-header.tsx` — replace `primaryRemoteMediaElement` with `audioElement`
11. Clean up `room-view.tsx` — pass `audioElement` instead of `primaryRemoteMediaElement`
12. Clean up `use-remote-media-elements.ts` — delete or simplify
13. Clean up `use-room-session.ts` — remove `primaryRemoteMediaElement` export, add `audioElement`
14. Verify speaker switching works for all participants

## Acceptance Criteria

- [ ] All remote participants' audio plays through Web Audio API mixer
- [ ] `<video>` elements are muted (no duplicate audio)
- [ ] Speaker switching (`setSinkId`) applies to all participants (not just primary)
- [ ] Audio output works in all browsers (setSinkId is progressive enhancement)
- [ ] Active speaker detection still works (remote via mixer analysers, local via separate AudioContext)
- [ ] Per-peer `GainNode` exists in mixer (ready for future volume UI)
- [ ] `IRemoteAudioMixer` interface extracted — hooks depend on abstraction, not concrete class (DIP)
- [ ] `RemoteAudioMixer` is framework-agnostic (no React deps)
- [ ] `updatePeerTrack` handles track replacement without audio glitches
- [ ] No audio glitches or echoes introduced
- [ ] Existing tests pass; new mixer class has unit tests (Web Audio API mocked)

## Testing Strategy

- `RemoteAudioMixer` unit tests mock `AudioContext`, `createMediaStreamDestination`, `createMediaStreamSource`, `createGain`, `createAnalyser` (Web Audio API not available in jsdom)
- Test: `addPeer`/`removePeer` node lifecycle, `updatePeerTrack` reconnects chain, `setSink` feature detection, `destroy` cleanup
- `useRemoteAudio` hook tested with `IRemoteAudioMixer` mock

## Open Questions

- **React context vs prop drilling** for `audioElement` — evaluate at implementation time based on component tree depth
- Whether `use-remote-media-elements.ts` is needed for anything other than `primaryRemoteMediaElement`

## Related Files

- `apps/client/src/components/remote-video.tsx`
- `apps/client/src/hooks/use-mediasoup.ts`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/components/room-header.tsx`
- `apps/client/src/features/room/components/remote-video-tile.tsx`
- `apps/client/src/features/room/components/room-view.tsx`
- `apps/client/src/features/room/hooks/use-remote-media-elements.ts`
- `apps/client/src/features/room/hooks/use-active-speaker.ts`
- `apps/client/src/features/room/hooks/use-room-session.ts`
- `apps/client/src/features/media/hooks/use-device-switching.ts`
- `apps/client/src/features/media/components/device-settings-panel.tsx`
