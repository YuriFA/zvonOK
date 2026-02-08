# TASK-024 — RTCPeerConnection Setup

## Status
planned

## Priority
high

## Description
Create WebRTC manager to handle RTCPeerConnection for P2P video calls. Manage multiple peer connections and track ICE candidates.

## Scope
- Create RTCPeerConnection for each peer
- Add local tracks to connections
- Handle ICE candidates
- Handle remote streams
- Manage connection lifecycle

## Out of Scope
- Offer/Answer exchange (TASK-025)
- SFU integration (Phase 7)

## Technical Design

### WebRTC Manager
```typescript
class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;

  setLocalStream(stream: MediaStream): void;
  createPeerConnection(peerId: string): RTCPeerConnection;
  closePeerConnection(peerId: string): void;
  closeAll(): void;
}
```

### ICE Configuration
```typescript
const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};
```

### Connection Lifecycle
1. Create RTCPeerConnection with ICE config
2. Add local tracks (audio/video) to connection
3. Set up ICE candidate handler
4. Set up remote track handler
5. Set up connection state handlers

## Acceptance Criteria
- [ ] Can create peer connection for remote peer
- [ ] Local tracks are added to connection
- [ ] ICE candidates are emitted via socket
- [ ] Remote tracks trigger UI updates
- [ ] Connection can be closed cleanly
- [ ] Handles multiple simultaneous peers

## Definition of Done
- Acceptance criteria satisfied
- No TODOs in manager code
- Proper cleanup on disconnect
- TypeScript types are strict

## Implementation Guide
See: `docs/tasks/phase-03-webrtc-p2p/3.3-rtc-peer-connection.md`

## Related Files
- `apps/client/src/lib/webrtc/manager.ts` - WebRTC manager
- `apps/client/src/lib/webrtc/index.ts` - Exports
- `apps/client/components/RemoteVideo.tsx` - Remote video display

## Browser APIs Used
- `RTCPeerConnection`
- `MediaStream`
- `RTCIceCandidate`
- `RTCTrackEvent`

## Next Task
TASK-025 — Offer/Answer Exchange
