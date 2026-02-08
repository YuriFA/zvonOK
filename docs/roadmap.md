# Roadmap

Implementation stages for the WebRTC Chat application.

## Stage 0 — Theory

**Status:** Completed
**Goal:** Understand WebRTC fundamentals before implementation

Tasks:
- [task-1](./tasks/stage-0/TASK-001-webrtc-basics.md) — WebRTC Basics (signalling, STUN, TURN, ICE)
- [task-2](./tasks/stage-0/TASK-002-p2p-vs-sfu.md) — P2P vs SFU Architecture

---

## Stage 0.5 — Frontend Auth

**Status:** Completed
**Goal:** Basic frontend with authentication system

Tasks:
- [task-1](./tasks/stage-0.5/TASK-001-project-setup.md) — React + Vite + Tailwind CSS v4 setup
- [task-2](./tasks/stage-0.5/TASK-002-ui-components.md) — Radix UI components
- [task-3](./tasks/stage-0.5/TASK-003-routing.md) — React Router v7 with file-routing
- [task-4](./tasks/stage-0.5/TASK-004-forms-validation.md) — React Hook Form + Zod
- [task-5](./tasks/stage-0.5/TASK-005-auth-api-client.md) — Auth API client with token refresh
- [task-6](./tasks/stage-0.5/TASK-006-login-page.md) — Login page
- [task-7](./tasks/stage-0.5/TASK-007-register-page.md) — Register page
- [task-8](./tasks/stage-0.5/TASK-008-auth-context.md) — AuthContext state management
- [task-9](./tasks/stage-0.5/TASK-009-lobby-page.md) — Main lobby page

**Result:** Fully working authentication on frontend

---

## Stage 1 — Backend

**Status:** Completed
**Goal:** Server setup with authentication and room API

Tasks:
- [task-1](./tasks/stage-1/TASK-001-postgresql-prisma.md) — PostgreSQL + Prisma setup
- [task-2](./tasks/stage-1/TASK-002-registration.md) — User registration endpoint
- [task-3](./tasks/stage-1/TASK-003-login-jwt.md) — JWT authentication with refresh tokens
- [task-4](./tasks/stage-1/TASK-004-room-model.md) — Room data model
- [task-5](./tasks/stage-1/TASK-005-rooms-api.md) — CRUD API for rooms

**Result:** Backend with Auth + Rooms

---

## Stage 1.5 — Client Rooms

**Status:** Completed
**Goal:** Client-side room management UI

Tasks:
- [task-1](./tasks/stage-1.5/TASK-001-client-rooms.md) — Room types, API, create dialog, lobby, room page
- [task-2](./tasks/stage-1.5/TASK-002-room-lobby.md) — Room lobby page with device selector and share link

**Result:** Users can create and join rooms via UI

---

## Stage 2 — Signalling Server

**Status:** Planned
**Goal:** WebSocket server for WebRTC signalling

Tasks:
- [task-1](./tasks/stage-2/TASK-001-socketio-server.md) — Socket.io server setup in NestJS
- [task-2](./tasks/stage-2/TASK-002-join-leave.md) — Room join/leave functionality
- [task-3](./tasks/stage-2/TASK-003-webrtc-signalling.md) — Offer/Answer/ICE exchange

**Result:** Signalling server ready for P2P

---

## Stage 2.5 — Socket.io Client

**Status:** Planned
**Goal:** Frontend WebSocket connection management

Tasks:
- [task-1](./tasks/stage-2.5/TASK-001-socketio-client.md) — Socket.io client setup, connection handling, room join/leave

**Result:** Client can connect to signalling server

---

## Stage 3 — WebRTC P2P

**Status:** Planned
**Goal:** 1-on-1 video calls via direct peer connection

Tasks:
- [task-1](./tasks/stage-3/TASK-001-media-stream.md) — Camera/microphone access
- [task-2](./tasks/stage-3/TASK-002-rtc-peer-connection.md) — RTCPeerConnection setup
- [task-3](./tasks/stage-3/TASK-003-offer-answer.md) — Offer/Answer exchange implementation
- [task-4](./tasks/stage-3/TASK-004-mute-unmute.md) — Media controls (mute/unmute)

**Result:** Working 1-on-1 video call

---

## Stage 4 — Screen Share

**Status:** Planned
**Goal:** Desktop/application window sharing

Tasks:
- [task-1](./tasks/stage-4/TASK-001-screen-share.md) — getDisplayMedia + replaceTrack
- [task-2](./tasks/stage-4/TASK-002-screen-share-ui.md) — Screen share button, status indicator, error handling (TODO: create file)

**Result:** Screen sharing capability

---

## Stage 5 — Device Management

**Status:** Planned
**Goal:** Switch between cameras, microphones, speakers

Tasks:
- [task-1](./tasks/stage-5/TASK-001-device-enumeration.md) — enumerateDevices API
- [task-2](./tasks/stage-5/TASK-002-device-switching.md) — Switch camera/mic/speaker
- [task-3](./tasks/stage-5/TASK-003-device-permissions.md) — Handle device permissions
- [task-4](./tasks/stage-5/TASK-004-device-selector-ui.md) — Device selector dropdown/settings panel (TODO: create file)
- [task-5](./tasks/stage-5/TASK-005-active-device-display.md) — Display currently active devices (TODO: create file)

**Result:** User can select input/output devices

---

## Stage 6 — Chat

**Status:** Planned
**Goal:** Real-time text chat with history

Tasks:
- [task-1](./tasks/stage-6/TASK-001-chat-model.md) — Message data model
- [task-2](./tasks/stage-6/TASK-002-chat-api.md) — Chat API endpoints
- [task-3](./tasks/stage-6/TASK-003-chat-websocket.md) — Real-time chat via WebSocket
- [task-4](./tasks/stage-6/TASK-004-chat-ui.md) — Chat container layout
- [task-5](./tasks/stage-6/TASK-005-message-list.md) — Message list component (TODO: create file)
- [task-6](./tasks/stage-6/TASK-006-message-input.md) — Message input component (TODO: create file)
- [task-7](./tasks/stage-6/TASK-007-chat-integration.md) — Chat integration in room page (TODO: create file)

**Result:** Working chat with history

---

## Stage 7 — SFU (Group Calls)

**Status:** Planned
**Goal:** Scalable group calls (3-10+ participants) via mediasoup

Tasks:
- [task-1](./tasks/stage-7/TASK-001-mediasoup-worker.md) — mediasoup Worker setup
- [task-2](./tasks/stage-7/TASK-002-mediasoup-router.md) — Router per room
- [task-3](./tasks/stage-7/TASK-003-mediasoup-transport.md) — Transport creation
- [task-4](./tasks/stage-7/TASK-004-mediasoup-producer.md) — Producer for incoming tracks
- [task-5](./tasks/stage-7/TASK-005-mediasoup-consumer.md) — Consumer for outgoing tracks
- [task-6](./tasks/stage-7/TASK-006-sfu-signalling.md) — SFU signalling protocol
- [task-7](./tasks/stage-7/TASK-007-sfu-client.md) — Client-side SFU integration
- [task-8](./tasks/stage-7/TASK-008-sfu-participants.md) — Participants list UI
- [task-9](./tasks/stage-7/TASK-009-sfu-quality-indicator.md) — Connection quality indicator

**Result:** Group video calls working

---

## Stage 8 — Video Grid

**Status:** Planned
**Goal:** Adaptive video layout with speaker detection

Tasks:
- [task-1](./tasks/stage-8/TASK-001-video-grid-layout.md) — CSS Grid adaptive layout
- [task-2](./tasks/stage-8/TASK-002-speaker-detection.md) — Active speaker detection

**Result:** Video tiles auto-arrange based on participant count

---

## Stage 9 — Deployment

**Status:** Planned
**Goal:** Production-ready deployment with HTTPS and TURN

Tasks:
- [task-1](./tasks/stage-9/TASK-001-https-caddy.md) — Caddy reverse proxy with auto HTTPS
- [task-2](./tasks/stage-9/TASK-002-turn-coturn.md) — coturn TURN server setup
- [task-3](./tasks/stage-9/TASK-003-deploy-process.md) — Production deployment process
- [task-4](./tasks/stage-9/TASK-004-client-build.md) — Client build and deployment

**Result:** Application available via HTTPS, works through NAT

---

## Stage 10 — Quality

**Status:** Planned
**Goal:** Network monitoring and adaptation

Tasks:
- [task-1](./tasks/stage-10/TASK-001-network-info.md) — Display connection quality metrics
- [task-2](./tasks/stage-10/TASK-002-bandwidth-adaptation.md) — Adaptive video quality
- [task-3](./tasks/stage-10/TASK-003-reconnection.md) — Automatic reconnection handling

**Result:** Stable connection with quality indicators

---

## Stage 11 — Future Enhancements

**Status:** Planned
**Goal:** UX improvements and additional features

Tasks:
- [task-1](./tasks/stage-11/TASK-001-e2e-testing.md) — Playwright end-to-end tests
- [task-2](./tasks/stage-11/TASK-002-error-boundaries.md) — Error boundaries and fallback UI
- [task-3](./tasks/stage-11/TASK-003-loading-states.md) — Improved loading states
- [task-4](./tasks/stage-11/TASK-004-notifications.md) — Toast notifications
- [task-5](./tasks/stage-11/TASK-005-dark-mode.md) — Dark theme support
- [task-6](./tasks/stage-11/TASK-006-responsiveness.md) — Mobile adaptation
- [task-7](./tasks/stage-11/TASK-007-keyboard-shortcuts.md) — Hotkey support
- [task-8](./tasks/stage-11/TASK-008-accessibility.md) — ARIA labels and a11y

**Result:** Enhanced user experience

---

## Timeline

| Stage | Status | Time Estimate |
|-------|--------|---------------|
| Stage 0 | Completed | 1-2 days |
| Stage 0.5 | Completed | 2-3 days |
| Stage 1 | Completed | 3-5 days |
| Stage 1.5 | Completed | 1-2 days |
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

1. **Stage 2** (Signalling Server) — Socket.io setup in NestJS
2. **Stage 2.5** (Socket.io Client) — Frontend WebSocket connection management
3. Follow task files in numerical order
4. Update task status as work progresses
5. Refer to [SDD](./SDD.md) for architecture and design decisions
