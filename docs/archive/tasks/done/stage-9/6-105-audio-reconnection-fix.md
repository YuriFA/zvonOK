# TASK-105 — Fix Audio Artifacts After Reconnection

> **Status:** completed
> **Priority:** high
> **Created:** 2026-04-09

---

## Description

After a peer loses connection and reconnects, the remote participant's audio sounds
"robotic" and lower-pitched (bassy) for several seconds. This is caused by Opus decoder
state desync after a DTX (Discontinuous Transmission) pause combined with an immediate
consumer resume that starts streaming before the jitter buffer has stabilised.

## Root Cause

1. **`opusDtx: true`** — DTX aggressively suppresses packets during silence. When the
   consumer resumes after reconnection, the decoder receives packets after a prolonged DTX
   gap, causing PLC (Packet Loss Concealment) artifacts that manifest as robotic pitch.
2. **No `opusFec`** — Forward Error Correction is not enabled, so the decoder cannot
   recover lost packets during the unstable reconnection window.
3. **Immediate consumer resume** — `sfu:resume-consumer` fires right after
   `recvTransport.consume()` resolves. For audio consumers, this gives the jitter buffer
   zero time to initialise, so early packets are decoded with incorrect state.

## Changes

### 1. `apps/client/src/lib/sfu/manager.ts`

- **Remove `opusDtx: true`** from audio producer `codecOptions` (line ~232).
  DTX provides minimal bandwidth savings (~5–10%) in an SFU scenario where the server
  controls forwarding; the audio quality tradeoff during reconnection is not worth it.
- **Add `opusFec: true`** to audio producer `codecOptions`. Forward Error Correction
  lets the Opus decoder reconstruct lost packets from redundant data, improving quality
  on unstable connections.
- **Delay audio consumer resume by 150 ms.** After `recvTransport.consume()` resolves,
  wait 150 ms before emitting `sfu:resume-consumer` for audio consumers. This gives the
  jitter buffer time to initialise and prevents the decoder from receiving packets before
  it is ready.

## Acceptance Criteria

- [x] `opusDtx` removed from audio codec options
- [x] `opusFec` added to audio codec options
- [x] Audio consumer resume delayed by 150 ms
- [x] Video consumer resume unchanged (immediate, as before)
- [x] No TypeScript or lint errors
