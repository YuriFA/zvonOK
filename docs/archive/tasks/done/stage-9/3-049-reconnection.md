# TASK-049 — Automatic Reconnection

> **Status:** completed
> **Priority:** low
> **Created:** 2026-02-08

---

## Description

Harden the reconnection flow for the SFU session after a WebSocket disconnect.
Socket.io's built-in reconnection is already configured in `SfuConnection`; the
task is to verify and fix the full recovery path — socket reconnect → SFU
re-join → WebRTC transport/producer restoration — and expose the reconnection
status to the user.

## Background: What Already Exists

`SfuConnection.connect()` (`apps/client/src/lib/sfu/connection.ts:27`) already
configures socket.io's built-in reconnection:

```ts
reconnection: true,
reconnectionAttempts: 10,   // max retries
reconnectionDelay: 1000,    // initial delay ms
reconnectionDelayMax: 5000, // cap for exponential backoff
```

`useMediasoup` (`apps/client/src/hooks/use-mediasoup.ts:215`) already reacts to
`connectionState === "connected"` and re-emits `sfu:join` when `joinedRef` is
`false`. This means the React layer already supports re-join after reconnect.

## Problem

When the socket disconnects, `SfuManager.handleDisconnected()` calls
`closeAll()` which closes all transports, producers, and consumers. When
socket.io reconnects, `handleConnected()` fires and `useMediasoup` will attempt
to re-join. However the following issues may prevent a clean recovery:

1. **`producedKindsRef` is not reset** on disconnect — after reconnect, tracks
   will not be re-produced because the ref still thinks they are already
   producing (`apps/client/src/hooks/use-mediasoup.ts:76`).
2. **`pendingNewProducers` accumulates stale entries** across reconnect cycles
   in `SfuManager` (`apps/client/src/lib/sfu/manager.ts:70`).
3. **Device is not reset** in `handleDisconnected()` — `this.device` remains
   non-null but its transports are closed; `loadDevice` in `handleJoined` will
   not be called again if the device guard `if (!this.device)` is present.
   Verify this is handled correctly.
4. **User sees no intermediate "Reconnecting…" state** — `ConnectionStatus`
   (`apps/client/src/features/room/components/connection-status.tsx`) maps
   `connecting` to a pulsing yellow icon, but this state is only set once on
   initial connect, not on subsequent reconnects driven by socket.io.

## Scope

- Audit and fix `producedKindsRef` reset on disconnect in `useMediasoup`
- Audit `SfuManager.handleDisconnected()` — ensure `device` and
  `pendingNewProducers` are correctly reset so `handleJoined` can reload the
  device cleanly on reconnect
- Set `connectionState: "connecting"` in `handleDisconnected()` (or via the
  socket.io `reconnect_attempt` event) so the UI shows "Reconnecting…"
- Validate max-retry behaviour: after 10 failed attempts, set
  `connectionState: "failed"` explicitly in the application layer
- Manual test: simulate disconnect (e.g. toggle network off/on in DevTools) and
  verify video/audio resumes without page reload

## Technical Design

### Reconnect Flow (end-to-end)

```
socket disconnect
  → SfuEventRouter fires onDisconnected
  → SfuManager.handleDisconnected()
      closeAll()                        // close transports/producers/consumers
      device = null                     // reset so loadDevice runs again on join
      pendingNewProducers = []          // discard stale buffer
      updateState({ connectionState: "connecting" })   // show "Reconnecting…"

  → socket.io internal retry loop (up to 10 attempts, exponential backoff 1–5s)

  → socket reconnect_failed (if all attempts exhausted)
      → SfuEventRouter fires onReconnectFailed (new handler)
      → SfuManager.handleReconnectFailed()
          updateState({ connectionState: "failed" })

  → socket reconnect (success)
      → SfuEventRouter fires onConnected
      → SfuManager.handleConnected()
          updateState({ connectionState: "connected" })

  → useMediasoup effect [connectionState]
      joinedRef.current === false  (was reset on disconnect)
      → sfuManager.joinRoom(...)   // re-emit sfu:join

  → server: sfu:joined → handleJoined → loadDevice (device is null → ok)
      → createTransports → sfu:transport-created

  → useMediasoup effect [isSendTransportCreated]
      producedKindsRef.current is empty  (was reset on disconnect)
      → sfuManager.produce(audioTrack)
      → sfuManager.produce(videoTrack)
```

### Changes Required

#### `apps/client/src/lib/sfu/manager.ts`

```ts
private handleDisconnected(): void {
  console.log("[SFU] Disconnected");
  this.closeAll();
  this.device = null;                 // allow loadDevice to run on re-join
  this.pendingNewProducers = [];      // discard stale buffer
  this.updateState({ connectionState: "connecting" }); // "Reconnecting…"
}

private handleReconnectFailed(): void {
  console.log("[SFU] Reconnect failed");
  this.updateState({ connectionState: "failed" });
}
```

Register `handleReconnectFailed` in `SfuEventRouter` via socket.io's
`"reconnect_failed"` event.

#### `apps/client/src/lib/sfu/event-router.ts`

Add `onReconnectFailed` to `SfuEventHandlers` interface and wire it to
`socket.on("reconnect_failed", ...)` in `setup()`.

#### `apps/client/src/hooks/use-mediasoup.ts`

In the `onStateChange` callback, reset `producedKindsRef.current` when
`connectionState` transitions to `"disconnected"` or `"connecting"`:

```ts
const unsubscribeState = sfuManager.onStateChange((nextState) => {
  setState(nextState);

  if (
    nextState.connectionState === "disconnected" ||
    nextState.connectionState === "connecting"
  ) {
    joinedRef.current = false;
    producedKindsRef.current.clear();   // <-- add this
  }
});
```

## Step-by-Step Instructions

1. **Audit `handleDisconnected`** in `manager.ts:382`. Add `this.device = null`
   and `this.pendingNewProducers = []`. Change the state update to
   `"connecting"` instead of `"disconnected"`.

2. **Add `reconnect_failed` handling** in `event-router.ts`. Extend
   `SfuEventHandlers` with `onReconnectFailed?: () => void`. In `setup()`, add:
   ```ts
   socket.on("reconnect_failed", () => this.handlers.onReconnectFailed?.());
   ```
   Wire it in `manager.ts` `createEventHandlers()` to call
   `handleReconnectFailed()`.

3. **Reset `producedKindsRef`** in `use-mediasoup.ts` inside the `onStateChange`
   callback when connection is no longer `"connected"`.

4. **Manual test**: open a call in two browser tabs, open DevTools → Network →
   throttle to Offline for 5 s, then restore. Confirm:
   - UI shows "Reconnecting…" (pulsing yellow) during outage
   - Video/audio resume automatically after network restores
   - No page reload needed

5. **Max-retry test**: keep network offline for >50 s (10 retries × 5 s max
   delay). Confirm `connectionState` becomes `"failed"` and UI shows "Connection
   failed" in red.

## Acceptance Criteria

- [ ] After a transient network outage (<30 s), video and audio resume
      automatically without a page reload
- [ ] During reconnection, `connectionState` is `"connecting"` — the
      `ConnectionStatus` component shows the pulsing yellow icon
- [ ] After 10 failed reconnection attempts, `connectionState` is `"failed"`
- [ ] `producedKindsRef` is cleared on disconnect so tracks are re-produced
      after reconnect
- [ ] `SfuManager.device` is `null` after disconnect so `loadDevice` runs
      cleanly on re-join

## Definition of Done

- [ ] All acceptance criteria pass via manual testing (two-tab DevTools network
      throttle scenario)
- [ ] No TypeScript errors (`pnpm -C apps/client build`)
- [ ] Existing client tests pass (`pnpm -C apps/client test:run`)

## Related Files

- `apps/client/src/lib/sfu/connection.ts` — socket.io connection config
- `apps/client/src/lib/sfu/manager.ts` — `handleDisconnected`, `handleReconnectFailed`
- `apps/client/src/lib/sfu/event-router.ts` — socket event wiring
- `apps/client/src/hooks/use-mediasoup.ts` — `producedKindsRef` reset
- `apps/client/src/features/room/components/connection-status.tsx` — UI status display
