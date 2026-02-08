# Roadmap

Implementation stages for the WebRTC Chat application.

## Stage 0 — Theory

**Status:** Completed
**Goal:** Understand WebRTC fundamentals before implementation

Tasks:
- [TASK-000](./tasks/TASK-000-theory.md) — WebRTC Basics (signalling, STUN, TURN, ICE)
- [TASK-001](./tasks/TASK-001-p2p-vs-sfu.md) — P2P vs SFU Architecture

---

## Stage 0.5 — Frontend Auth

**Status:** Completed
**Goal:** Basic frontend with authentication system

Tasks:
- [TASK-005](./tasks/TASK-005-project-setup.md) — React + Vite + Tailwind CSS v4 setup
- [TASK-006](./tasks/TASK-006-ui-components.md) — Radix UI components
- [TASK-007](./tasks/TASK-007-routing.md) — React Router v7 with file-routing
- [TASK-008](./tasks/TASK-008-forms-validation.md) — React Hook Form + Zod
- [TASK-009](./tasks/TASK-009-auth-api-client.md) — Auth API client with token refresh
- [TASK-010](./tasks/TASK-010-login-page.md) — Login page
- [TASK-011](./tasks/TASK-011-register-page.md) — Register page
- [TASK-012](./tasks/TASK-012-auth-context.md) — AuthContext state management
- [TASK-013](./tasks/TASK-013-lobby-page.md) — Main lobby page

**Result:** Fully working authentication on frontend

---

## Stage 1 — Backend

**Status:** Completed
**Goal:** Server setup with authentication and room API

Tasks:
- [TASK-014](./tasks/TASK-014-postgresql-prisma.md) — PostgreSQL + Prisma setup
- [TASK-015](./tasks/TASK-015-registration.md) — User registration endpoint
- [TASK-016](./tasks/TASK-016-login-jwt.md) — JWT authentication with refresh tokens
- [TASK-017](./tasks/TASK-017-room-model.md) — Room data model
- [TASK-018](./tasks/TASK-018-rooms-api.md) — CRUD API for rooms

**Result:** Backend with Auth + Rooms

---

## Stage 1.5 — Client Rooms

**Status:** In progress
**Goal:** Client-side room management UI

Tasks:
- [TASK-019](./tasks/TASK-019-client-rooms.md) — Room types, API, create dialog, lobby, room page

**Result:** Users can create and join rooms via UI

---

## Stage 2 — Signalling Server

**Status:** Planned
**Goal:** WebSocket server for WebRTC signalling

Tasks:
- [TASK-020](./tasks/TASK-020-socketio-server.md) — Socket.io server setup in NestJS
- [TASK-021](./tasks/TASK-021-join-leave.md) — Room join/leave functionality
- [TASK-022](./tasks/TASK-022-webrtc-signalling.md) — Offer/Answer/ICE exchange

**Result:** Signalling server ready for P2P

---

## Stage 2.5 — Socket.io Client

**Status:** Planned
**Goal:** Frontend WebSocket connection management

Tasks:
- [TASK-023](./tasks/TASK-023-socketio-client.md) — Socket.io client setup, connection handling, room join/leave

**Result:** Client can connect to signalling server

---

## Stage 3 — WebRTC P2P

**Status:** Planned
**Goal:** 1-on-1 video calls via direct peer connection

Tasks:
- [TASK-024](./tasks/TASK-024-media-stream.md) — Camera/microphone access
- [TASK-025](./tasks/TASK-025-rtc-peer-connection.md) — RTCPeerConnection setup
- [TASK-026](./tasks/TASK-026-offer-answer.md) — Offer/Answer exchange implementation
- [TASK-027](./tasks/TASK-027-mute-unmute.md) — Media controls (mute/unmute)

**Result:** Working 1-on-1 video call

---

## Stage 4 — Screen Share

**Status:** Planned
**Goal:** Desktop/application window sharing

Tasks:
- [TASK-028](./tasks/TASK-028-screen-share.md) — getDisplayMedia + replaceTrack
- [TASK-062](./tasks/TASK-062-screen-share-ui.md) — Screen share button, status indicator, error handling

**Result:** Screen sharing capability

---

## Stage 5 — Device Management

**Status:** Planned
**Goal:** Switch between cameras, microphones, speakers

Tasks:
- [TASK-029](./tasks/TASK-029-device-enumeration.md) — enumerateDevices API
- [TASK-030](./tasks/TASK-030-device-switching.md) — Switch camera/mic/speaker
- [TASK-031](./tasks/TASK-031-device-permissions.md) — Handle device permissions
- [TASK-063](./tasks/TASK-063-device-selector-ui.md) — Device selector dropdown/settings panel
- [TASK-064](./tasks/TASK-064-active-device-display.md) — Display currently active devices

**Result:** User can select input/output devices

---

## Stage 6 — Chat

**Status:** Planned
**Goal:** Real-time text chat with history

Tasks:
- [TASK-032](./tasks/TASK-032-chat-model.md) — Message data model
- [TASK-033](./tasks/TASK-033-chat-api.md) — Chat API endpoints
- [TASK-034](./tasks/TASK-034-chat-websocket.md) — Real-time chat via WebSocket
- [TASK-035](./tasks/TASK-035-chat-container.md) — Chat container layout
- [TASK-065](./tasks/TASK-065-message-list.md) — Message list component
- [TASK-066](./tasks/TASK-066-message-input.md) — Message input component
- [TASK-067](./tasks/TASK-067-chat-integration.md) — Chat integration in room page

**Result:** Working chat with history

---

## Stage 7 — SFU (Group Calls)

**Status:** Planned
**Goal:** Scalable group calls (3-10+ participants) via mediasoup

Tasks:
- [TASK-036](./tasks/TASK-036-mediasoup-worker.md) — mediasoup Worker setup
- [TASK-037](./tasks/TASK-037-mediasoup-router.md) — Router per room
- [TASK-038](./tasks/TASK-038-mediasoup-transport.md) — Transport creation
- [TASK-039](./tasks/TASK-039-mediasoup-producer.md) — Producer for incoming tracks
- [TASK-040](./tasks/TASK-040-mediasoup-consumer.md) — Consumer for outgoing tracks
- [TASK-041](./tasks/TASK-041-sfu-signalling.md) — SFU signalling protocol
- [TASK-042](./tasks/TASK-042-sfu-client.md) — Client-side SFU integration
- [TASK-059](./tasks/TASK-059-sfu-participants.md) — Participants list UI
- [TASK-060](./tasks/TASK-060-sfu-quality-indicator.md) — Connection quality indicator

**Result:** Group video calls working

---

## Stage 8 — Video Grid

**Status:** Planned
**Goal:** Adaptive video layout with speaker detection

Tasks:
- [TASK-043](./tasks/TASK-043-video-grid-layout.md) — CSS Grid adaptive layout
- [TASK-044](./tasks/TASK-044-speaker-detection.md) — Active speaker detection

**Result:** Video tiles auto-arrange based on participant count

---

## Stage 9 — Deployment

**Status:** Planned
**Goal:** Production-ready deployment with HTTPS and TURN

Tasks:
- [TASK-045](./tasks/TASK-045-https-caddy.md) — Caddy reverse proxy with auto HTTPS
- [TASK-046](./tasks/TASK-046-turn-coturn.md) — coturn TURN server setup
- [TASK-047](./tasks/TASK-047-deploy-process.md) — Production deployment process
- [TASK-061](./tasks/TASK-061-client-build.md) — Client build and deployment

**Result:** Application available via HTTPS, works through NAT

---

## Stage 10 — Quality

**Status:** Planned
**Goal:** Network monitoring and adaptation

Tasks:
- [TASK-048](./tasks/TASK-048-network-info.md) — Display connection quality metrics
- [TASK-049](./tasks/TASK-049-bandwidth-adaptation.md) — Adaptive video quality
- [TASK-050](./tasks/TASK-050-reconnection.md) — Automatic reconnection handling

**Result:** Stable connection with quality indicators

---

## Stage 11 — Future Enhancements

**Status:** Planned
**Goal:** UX improvements and additional features

Tasks:
- [TASK-051](./tasks/TASK-051-e2e-testing.md) — Playwright end-to-end tests
- [TASK-052](./tasks/TASK-052-error-boundaries.md) — Error boundaries and fallback UI
- [TASK-053](./tasks/TASK-053-loading-states.md) — Improved loading states
- [TASK-054](./tasks/TASK-054-notifications.md) — Toast notifications
- [TASK-055](./tasks/TASK-055-dark-mode.md) — Dark theme support
- [TASK-056](./tasks/TASK-056-responsiveness.md) — Mobile adaptation
- [TASK-057](./tasks/TASK-057-keyboard-shortcuts.md) — Hotkey support
- [TASK-058](./tasks/TASK-058-accessibility.md) — ARIA labels and a11y

**Result:** Enhanced user experience

---

## Timeline

| Stage | Status | Time Estimate |
|-------|--------|---------------|
| Stage 0 | Completed | 1-2 days |
| Stage 0.5 | Completed | 2-3 days |
| Stage 1 | Completed | 3-5 days |
| Stage 1.5 | In progress | 1-2 days |
| Stage 2 | Planned | 2-3 days |
| Stage 2.5 | Planned | 1 day |
| Stage 3 | Planned | 3-4 days |
| Stage 4 | Planned | 1-2 days |
| Stage 5 | Planned | 1-2 days |
| Stage 6 | Planned | 2-3 days |
| Stage 7 | Planned | 5-7 days |
| Stage 8 | Planned | 2-3 days |
| Stage 9 | Planned | 2-3 days |
| Stage 10 | Planned | 2-3 days |
| Stage 11 | Planned | TBD |

**Total:** 3-6 weeks for full implementation

**MVP Path:** Stages 0-6 + basic deploy = 1-2 weeks

---

## Next Steps

1. **Stage 1.5** (Client Rooms) — implement room UI on frontend
2. **Stage 2** (Signalling Server) — Socket.io setup in NestJS
3. Follow task files in numerical order
4. Update task status as work progresses
5. Refer to [SDD](./SDD.md) for architecture and design decisions
