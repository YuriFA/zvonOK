# TASK-064 — Fix Missing Participant Without Media

## Status
completed

## Priority
high

## Description
When a second user joins a call and denies media permissions (camera or microphone), they don't appear at all for the first user. The participant should be visible in both the video grid (as a tile without media) and the participants list, even if they have no active media tracks.

## Scope
- Ensure peer joins room even without media tracks
- Show participant tile with avatar/placeholder when no video
- Update participants list to show users without media
- Handle SFU peer joining without producing tracks
- Introduce explicit peer presence separate from track production

## Out of Scope
- Changes to media permission request flow
- Audio-only mode handling (separate task)
- Pre-join lobby implementation

## Technical Design

### Current Behavior
When a user denies media permissions, the `MediaStreamManager.startStreamWithFallback()` throws an error if both audio and video are denied. The SFU connection may still happen, but no tracks are produced.

### Expected Behavior
1. Peer should join the SFU room regardless of media availability
2. Other participants should see the peer in the participants list
3. Video grid should show a placeholder tile for peers without video

### Presence Contract
- Peer presence must not depend on `sfu:new-producer`
- Server should expose peer join information even when a peer has zero producers
- Client should create a remote participant model before any media tracks are consumed

### Implementation Areas
```typescript
// use-mediasoup.ts - Peer join should not depend on media tracks
sfuManager.onPeerJoined((peer: SfuPeerInfo) => {
  // This already exists, but peer may not appear if no tracks are consumed
  setRemotePeers((prev) => updateRemotePeer(prev, peer.userId, ...));
});
```

### Server-side Consideration
Add or reuse an SFU-level peer presence event so joins are visible even when the peer has no producers.

## Acceptance Criteria
- [x] User who denies all media permissions appears in participants list for others
- [x] User without video shows a placeholder tile with username/avatar
- [x] User without audio shows muted indicator
- [x] Existing media functionality unaffected

## Definition of Done
- Peer visibility independent of media tracks
- Placeholder UI implemented for media-less participants
- Explicit peer presence contract documented in client/server integration
- Manual testing with various permission scenarios
- No regression in existing media handling

## Related Files
- `apps/client/src/hooks/use-mediasoup.ts`
- `apps/client/src/routes/room.tsx`
- `apps/client/src/components/remote-video.tsx`
- `apps/server/src/gateway/webrtc.gateway.ts`

## Related Tasks
- TASK-041 — SFU Client Integration
- TASK-065 — Proper Camera Toggle Implementation

## Next Task
TASK-065 — Proper Camera Toggle Implementation
