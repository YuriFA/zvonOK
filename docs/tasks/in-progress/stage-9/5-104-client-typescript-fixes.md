# TASK-104 — Client TypeScript Fixes

> **Status:** completed
> **Priority:** high
> **Created:** 2026-04-09

---

## Description

Resolve client-side TypeScript errors that block the explicit `tsc --noEmit` check.

## Scope

- Reproduce the failing client typecheck command
- Apply the smallest safe fix in the affected client module
- Re-run client typecheck to confirm a clean result

## Technical Design

### SFU producer encodings

The client SFU manager passes simulcast encodings into `sendTransport.produce()`. The current encoding constant is inferred as a readonly tuple, but mediasoup expects a mutable `RtpEncodingParameters[]`. The fix should align the constant's type with the library API without changing runtime behavior.

## Acceptance Criteria

- [x] `pnpm -C apps/client exec tsc --noEmit` passes
- [x] The SFU manager keeps the existing simulcast layer values
- [x] No unrelated client behavior changes are introduced

## Related Files

- `apps/client/src/lib/sfu/manager.ts`

## Outcome

- Typed the simulcast encoding constant as `RtpEncodingParameters[]` to match mediasoup's `produce()` API
- Kept the existing low/mid/high simulcast layer values unchanged
- Cleaned up `forEach` callbacks in the same module so the client TypeScript/lint checks pass cleanly
