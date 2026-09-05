# TASK-050 — Peer Quality Layer Cleanup

> **Status:** completed
> **Priority:** high
> **Created:** 2026-04-09

---

## Description

Fix stale simulcast layer state in the client peer-quality provider so debounced layer switches always target the current consumer and per-user state is cleared when peers leave.

## Scope

- Refresh the target consumer ID at emit time inside the debounce window
- Avoid recording a layer switch when no current video consumer exists
- Clear per-user debounce state when peers leave or stats disappear
- Add regression tests for consumer replacement and leave/rejoin flows

## Technical Design

### Debounced layer switching

`PeerQualityProvider` currently captures a consumer ID before the debounce delay. The fix resolves the current consumer inside the timeout callback immediately before calling `setPreferredLayers()`.

### Per-user cleanup

The provider keeps per-user timers and remembered layers in refs keyed by `userId`. Those entries must be cleared when a peer leaves and when quality stats no longer include that user.

## Acceptance Criteria

- Layer switches use the latest consumer ID after reconnect or re-consume
- No layer is marked as emitted when the consumer no longer exists
- Leaving and rejoining with the same user ID does not inherit stale layer state
- Client regression tests cover both failure modes

## Related Files

- `apps/client/src/features/room/contexts/peer-quality.context.tsx`
- `apps/client/src/features/room/contexts/__tests__/peer-quality.context.test.tsx`
- `apps/client/src/lib/sfu/__mocks__/manager.ts`

## Outcome

- Debounced layer switches now resolve the current consumer ID at emit time
- Per-user layer state is cleared on `onPeerLeft` and when stats no longer contain the user
- Regression coverage added for consumer replacement and leave/rejoin cases
- Verified with targeted Vitest suites and `react-doctor`
