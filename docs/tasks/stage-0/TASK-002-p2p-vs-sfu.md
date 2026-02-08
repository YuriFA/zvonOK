# TASK-001 — P2P vs SFU Architecture

## Status
completed

## Priority
high

## Description
Understand different architectures for video calls: Mesh (P2P), SFU, and MCU. Learn why P2P doesn't scale for groups and when to use SFU.

## Scope
- Study Mesh (P2P) architecture for 1-on-1 calls
- Learn SFU (Selective Forwarding Unit) architecture
- Understand MCU (Multipoint Control Unit) architecture
- Compare bandwidth, CPU, and scalability
- Learn about Simulcast and SVC
- Evaluate SFU solutions (mediasoup, LiveKit, etc.)

## Out of Scope
- Actual SFU implementation (covered in TASK-035 to TASK-041)
- P2P implementation details (covered in TASK-022 to TASK-026)

## Technical Design

### Study Materials
1. SFU vs MCU vs Mesh comparison
2. mediasoup documentation - Why SFU section
3. LiveKit and Janus architecture documentation

### Architectures

**Mesh (P2P):**
- Each peer connects to every other peer
- N participants = N-1 connections per peer
- Upload: 1 stream, Download: N-1 streams
- Works for 2-3 participants only
- Bandwidth: O(N²), CPU: O(N)

**SFU (Selective Forwarding Unit):**
- Each peer sends 1 stream to SFU
- SFU forwards streams to all participants
- NO encoding/decoding on server
- Scales to 100+ participants
- Server bandwidth: O(N²)

**MCU (Multipoint Control Unit):**
- Server decodes, mixes, encodes all streams
- Single composite stream to each participant
- High server CPU load
- Higher latency

### Key Technologies
- **Simulcast**: Multiple quality layers sent simultaneously
- **SVC (Scalable Video Coding)**: Layered encoding

### SFU Solutions Comparison
| Solution | Language | License | Notes |
|----------|----------|---------|-------|
| mediasoup | C++ + Node.js | ISC | Popular, good docs, TypeScript SDK |
| Janus | C | GPL | Plugin architecture |
| Jitsi | Java | Apache | Complete solution |
| Pion | Go | MIT | Pure Go |

### Project Recommendation
Start with P2P for 1-on-1 (TASK-022 to TASK-026), then add mediasoup for groups (TASK-035 to TASK-041).

## Acceptance Criteria
- Can explain why Mesh doesn't scale for 10+ participants
- Understand what SFU does with media streams (forwards only)
- Know difference between SFU and MCU
- Understand Simulcast concept
- Can justify choice of mediasoup for this project

## Definition of Done
- All study materials reviewed
- Can compare Mesh vs SFU vs MCU trade-offs
- Understand bandwidth/CPU implications
- Ready to proceed with implementation

## Implementation Guide

## Related Files
- None (theory task)

## Next Task
TASK-005 — Project Setup (React + Vite + Tailwind CSS v4)
