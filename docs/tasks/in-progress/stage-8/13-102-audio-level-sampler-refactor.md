# TASK-102 — Refactor Audio Logic into SOLID Classes

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-30

---

## Description

Extract duplicated audio analysis logic from `use-participant-audio-levels.ts`, `use-active-speaker.ts`, and `remote-audio-mixer.ts` into two SOLID classes in `lib/audio/`. Both hooks currently create their own `AudioContext` + `AnalyserNode` chains with identical configuration, duplicate EMA smoothing, and manage node lifecycle inline. This refactor eliminates ~200 lines of duplication and provides a single shared `AudioLevelSampler` instance per room session.

## Scope

- Create `AudioLevelSampler` class (owned + borrowed analyser management, sampling, EMA smoothing)
- Create `ActiveSpeakerDetector` class (pure hysteresis logic, no Web Audio dependency)
- Move shared logic into these classes
- Consolidate into single sampler instance in `use-room-session.ts`
- Delete `use-participant-audio-levels.ts` and `use-active-speaker.ts`

## Technical Design

### 1. `AudioLevelSampler` — `lib/audio/audio-level-sampler.ts`

**Responsibility:** own analyser nodes, measure levels, apply EMA smoothing.

```
class AudioLevelSampler {
  addOwned(id: string, stream: MediaStream): void
  addBorrowed(id: string, analyser: AnalyserNode): void
  remove(id: string): void
  sample(): Map<string, number>
  clear(): void
  dispose(): void
}
```

**Internal types:**

- `OwnedEntry` — `AudioContext` + `AnalyserNode` (fftSize=512, smoothingTimeConstant=0.3) + `MediaStreamAudioSourceNode` + silent `GainNode` (gain=0) → `destination`. Cleanup on remove/dispose.
- `BorrowedEntry` — just an `AnalyserNode` reference. No cleanup.

**`sample()` logic:**

1. Iterate all entries
2. `calculateRmsLevel(entry.analyser)` for each
3. Apply EMA: `smoothed = prev + 0.3 * (raw - prev)`
4. Return `Map<id, smoothedLevel>`

### 2. `ActiveSpeakerDetector` — `lib/audio/active-speaker-detector.ts`

**Responsibility:** pure hysteresis-based speaker detection. No Web Audio knowledge.

```
class ActiveSpeakerDetector {
  constructor(options: {
    speakingThreshold?: number;  // default 0.003
    holdTime?: number;           // default 800ms
    switchMargin?: number;       // default 1.3
  })

  detect(levels: Map<string, number>): string | null
  reset(): void
}
```

**`detect()` logic (from `use-active-speaker.ts:182-263`):**

1. Find loudest speaker above threshold
2. If no speaker: start silence timer, clear after `holdTime`
3. If same speaker: update level, reset silence timer
4. If different speaker: switch only if `holdTime` passed AND new level > current × `switchMargin`

### 3. Integration in `use-room-session.ts`

- Single `samplerRef = useRef(new AudioLevelSampler())`
- Single `detectorRef = useRef(new ActiveSpeakerDetector({...}))`
- Effect manages entries: `addOwned` for local, `addBorrowed` for remote via `mixer.getAnalyser()`
- One `setInterval` at 100ms:
  - Every tick: `sampler.sample()` → `setAudioLevels`
  - Every 2nd tick: `detector.detect(levels)` → `setActiveSpeakerId`
- Add `audioLevels: Map<string, number>` to `UseRoomSessionResult`
- Cleanup on unmount: `sampler.dispose()`, `detector.reset()`

### 4. `active-room-view.tsx`

- Remove `useParticipantAudioLevels` import and call
- Use `session.audioLevels` instead

### 5. Delete

- `features/room/hooks/use-participant-audio-levels.ts`
- `features/room/hooks/use-active-speaker.ts`

## SOLID Verification

| Principle | Compliance |
|-----------|-----------|
| **S** — Single Responsibility | Sampler = measure levels; Detector = identify speaker; Mixer = playback |
| **O** — Open/Closed | New source → `addBorrowed`; new detection algorithm → different class |
| **L** — Liskov | No inheritance needed |
| **I** — Interface Segregation | Detector accepts only `Map<string, number>` |
| **D** — Dependency Inversion | Detector depends on abstract levels map, not AudioContext |

## Acceptance Criteria

- [ ] `AudioLevelSampler` manages owned and borrowed analyser entries
- [ ] `AudioLevelSampler.sample()` returns smoothed levels via EMA
- [ ] `AudioLevelSampler` properly cleans up owned AudioContext/AnalyserNode chains
- [ ] `ActiveSpeakerDetector.detect()` implements hysteresis with threshold, holdTime, switchMargin
- [ ] `ActiveSpeakerDetector` has no Web Audio API imports
- [ ] Single `AudioLevelSampler` instance shared between audio levels and active speaker detection
- [ ] `use-room-session.ts` returns `audioLevels` in `UseRoomSessionResult`
- [ ] `active-room-view.tsx` uses `session.audioLevels` (no separate hook)
- [ ] `use-participant-audio-levels.ts` deleted
- [ ] `use-active-speaker.ts` deleted
- [ ] Existing tests pass
- [ ] Unit tests for `AudioLevelSampler`
- [ ] Unit tests for `ActiveSpeakerDetector`
- [ ] `routes/__tests__/room.test.tsx` mock updated with `audioLevels`

## Related Files

- `apps/client/src/lib/audio/audio-level-sampler.ts` (new)
- `apps/client/src/lib/audio/active-speaker-detector.ts` (new)
- `apps/client/src/lib/audio/audio-utils.ts`
- `apps/client/src/lib/audio/remote-audio-mixer.ts`
- `apps/client/src/features/room/hooks/use-room-session.ts`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/features/room/hooks/use-participant-audio-levels.ts` (delete)
- `apps/client/src/features/room/hooks/use-active-speaker.ts` (delete)
- `apps/client/src/routes/__tests__/room.test.tsx`
