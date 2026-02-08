# TASK-026 — Offer/Answer Exchange Implementation

## Status
planned

## Priority
high

## Description
Implement P2P connection establishment through SDP offer/answer exchange between two participants.

## Scope
- Create useWebRTC hook for WebRTC management
- Implement offer creation (for initiator)
- Implement answer creation (for receiver)
- Handle remote description setting
- Exchange ICE candidates via Socket.io
- Display remote video streams
- Handle peer connection cleanup

## Out of Scope
- SFU implementation (covered in TASK-035 to TASK-041)
- Media controls (covered in TASK-026)

## Technical Design

### WebRTC Hook Pattern
```typescript
export function useWebRTC(roomId: string, localStream: MediaStream | null) {
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const peerConnections = useRef(new Map());

  // Create peer connection
  // Create offer
  // Handle incoming offer
  // Create/send answer
  // Handle ICE candidates
  // Cleanup
}
```

### Signalling Flow
1. Initiator creates RTCPeerConnection
2. Initiator creates offer → setLocalDescription
3. Socket emits offer to receiver
4. Receiver creates RTCPeerConnection
5. Receiver sets remote description → creates answer → setLocalDescription
6. Socket emits answer to initiator
7. Initiator sets remote description
8. ICE candidates exchanged
9. Connection established

### ICE Candidates Queue
- Queue candidates before remoteDescription is set
- Apply queued candidates after remoteDescription

## Acceptance Criteria
- Offer created when new participant joins
- Answer created when offer received
- Remote descriptions set correctly
- ICE candidates added without errors
- Two tabs can see each other's video
- Peer connection closes on disconnect

## Definition of Done
- Offer/answer exchange working
- Video displayed in both directions
- ICE candidates exchanged
- Proper cleanup on disconnect
- No memory leaks

## Implementation Guide

## Related Files
- `apps/client/src/hooks/use-webrtc.ts`
- `apps/client/src/components/local-video.tsx`
- `apps/client/src/components/remote-video.tsx`

## Next Task
TASK-026 — Media Controls (Mute/Unmute)
