# TASK-108 — Fix screen share stop not updating remote peer state

> **Status:** done
> **Priority:** high
> **Created:** 2026-04-13

---

## Description

When a remote user stops screen sharing, the local user's UI does not update — it
continues to show the screen share spotlight. The root cause is that the client-side
`handleScreenShareStopped` handler only updates `isScreenShareBlocked` but never
clears `isScreenSharing` or `screenStream` on the remote peer. Additionally, the
server never notifies clients to close the screen-share consumer, so the consumer
and its track remain alive.

## Scope

- Server: emit `sfu:consumer-closed` to affected peers when a screen-share producer is closed
- Client `manager.ts`: handle `sfu:consumer-closed` — close the consumer, which fires `track.onended`
- Client `manager.ts`: add `onScreenShareStopped` callback set; call it from `handleScreenShareStopped`
- Client `event-router.ts`: register `sfu:consumer-closed` socket event
- Client `types.ts`: add `SfuConsumerClosedPayload`
- Client `interfaces.ts`: add `onScreenShareStopped` to `ISfuManager`
- Client `use-mediasoup.ts`: subscribe to `onScreenShareStopped` and clear peer's `isScreenSharing` + `screenStream`

## Technical Design

### Server (`sfu.service.ts` — `closeProducerForPeer`)

After closing the screen-share producer, find all consumers on other peers whose
`producerId` matches the closed producer and:
1. Close them on the server (mediasoup consumer).
2. Emit `sfu:consumer-closed { consumerId }` to each affected client.

This ensures the client-side consumer receives a close signal, the underlying
`RTCRtpReceiver` track fires `ended`, which triggers `track.onended` and clears
`screenStream` + `isScreenSharing` in `use-mediasoup.ts`.

### Client (`manager.ts` — `handleConsumerCreated`)

No change needed — `consumer.on("trackended")` already closes the consumer and
removes it from `this.consumers`. The `track.onended` callback registered in
`use-mediasoup.ts` will fire and clean up peer state.

### Client (`manager.ts` — `handleScreenShareStopped`)

Add a `screenShareStoppedCallbacks` set. Call all callbacks with `{ userId }` from
`handleScreenShareStopped`. This is a safety net in case the consumer-closed path is
slow or the server-side consumer close notification arrives after the spotlight
already re-rendered.

### Client (`use-mediasoup.ts`)

Subscribe to `onScreenShareStopped` and immediately clear the remote peer's
`isScreenSharing: false` and `screenStream: null`. This guarantees the spotlight
disappears without waiting for the `track.onended` event.

## Acceptance Criteria

- [ ] When a remote user stops screen sharing, the spotlight disappears for all other participants immediately
- [ ] The consumer is closed on both server and client side
- [ ] `track.onended` fires on the client side (verifiable via console log)
- [ ] `isScreenShareBlocked` is reset to `false` on other clients
- [ ] Server and client tests pass

## Related Files

- `apps/server/src/sfu/sfu.service.ts`
- `apps/client/src/lib/sfu/types.ts`
- `apps/client/src/lib/sfu/interfaces.ts`
- `apps/client/src/lib/sfu/event-router.ts`
- `apps/client/src/lib/sfu/manager.ts`
- `apps/client/src/hooks/use-mediasoup.ts`
