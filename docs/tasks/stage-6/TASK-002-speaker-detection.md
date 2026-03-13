# TASK-043 — Active Speaker Detection

## Status
planned

## Priority
medium

## Description

Implement active speaker detection that highlights the participant currently speaking in group calls.

## Scope
- Analyze remote audio tracks on the client with Web Audio API
- Calculate smoothed volume per participant
- Identify the dominant speaker with hysteresis to avoid flicker
- Highlight the active speaker in the room UI
- Fall back to "no active speaker" when all levels are below threshold

## Out of Scope
- Server-side audio observer or mediasoup-specific speaker events
- Per-participant volume meters
- Recording or moderation features

## Technical Design

### Recommended Approach
```typescript
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(remoteStream);
const analyser = audioContext.createAnalyser();

analyser.fftSize = 512;
source.connect(analyser);

const samples = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteTimeDomainData(samples);
```

### Detection Rules
- Sample every 150-250 ms on the client
- Convert analyser samples to RMS or normalized level per participant
- Use a minimum speaking threshold plus a hold window of 600-1000 ms
- Switch active speaker only when the next participant is clearly above the current one

### Why This Approach
- Works consistently across browsers without depending on non-portable RTC stats fields
- Avoids extra server work for a UI-only feature
- Matches the expected Google Meet-like behavior closely enough for current scope

## Acceptance Criteria
- Active speaker is highlighted in the room UI
- Highlight reacts within about 1 second of a speaker change
- Brief background noise does not cause rapid speaker flicker
- When nobody is speaking, no participant is highlighted as active
- Implementation does not require new SFU server events

## Definition of Done
- Hook manages analyser lifecycle for joining and leaving peers
- UI highlighting is functional for multi-user calls
- Performance remains acceptable during group calls
- Manual testing covers silence, single speaker, and quick speaker changes

## Related Files
- `apps/client/src/features/room/hooks/use-active-speaker.ts`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/components/video-grid.tsx`

## Next Task
TASK-067 — Call Ended State
