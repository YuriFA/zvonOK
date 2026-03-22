# TASK-000 — WebRTC Basics

## Status
planned

## Priority
high

## Description
Understand fundamental WebRTC concepts before implementation: signalling, STUN/TURN servers, ICE candidates, SDP, and the peer connection establishment process.

## Scope
- Learn WebRTC architecture and components
- Understand signalling server role
- Study STUN/TURN/ICE protocols
- Learn SDP format and RTCPeerConnection API
- Understand the offer/answer exchange flow

## Out of Scope
- Actual implementation (covered in later tasks)
- SFU architecture (covered in TASK-001)
- Specific code examples

## Technical Design

### Study Materials
1. WebRTC for the Curious (chapters 1-3) - https://webrtcforthecurious.com/
2. MDN WebRTC API documentation
3. WebRTC signalling flow documentation

### Key Concepts
- **Signalling**: Metadata exchange for P2P connection establishment (NOT media transport)
- **STUN**: Server that reveals client's public IP:port
- **TURN**: Relay server for when direct P2P fails
- **ICE**: Protocol for finding best connection path
- **SDP**: Text format for describing media session (codecs, IPs, ports)
- **RTCPeerConnection**: Browser API for WebRTC

### Connection Flow
1. Caller creates offer → setLocalDescription
2. Signalling sends offer to callee
3. Callee receives offer → setRemoteDescription → create answer → setLocalDescription
4. Signalling sends answer to caller
5. Caller receives answer → setRemoteDescription
6. ICE candidates exchanged via signalling
7. Connection established

## Acceptance Criteria
- Can explain why signalling is needed for P2P
- Understand difference between STUN and TURN
- Can describe the offer/answer exchange process
- Know what SDP contains
- Understand ICE candidate types (host, srflx, relay)

## Definition of Done
- All study materials reviewed
- Can answer: "Why not use WebSocket for media?"
- Can answer: "When is TURN required?"
- Understand the complete signalling flow

## Implementation Guide

## Related Files
- None (theory task)

## Next Task
TASK-001 — P2P vs SFU Architecture
