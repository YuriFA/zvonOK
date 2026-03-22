# Roadmap

Implementation stages for the WebRTC Chat application.

---

## Done (v0.1.0-alpha)

### Stage 0 — Theory

**Status:** Completed  
**Goal:** Understand WebRTC fundamentals before implementation  
**Result:** WebRTC basics (signalling, STUN, TURN, ICE) and P2P vs SFU architecture understood

---

### Stage 0.5 — Frontend Auth

**Status:** Completed  
**Goal:** Basic frontend with authentication system  
**Result:** Fully working authentication on frontend (login, register, auth context)

---

### Stage 1 — Backend

**Status:** Completed  
**Goal:** Server setup with authentication and room API  
**Result:** Backend with Auth + Rooms (NestJS, Prisma, JWT)

---

### Stage 1.5 — Client Rooms

**Status:** Completed  
**Goal:** Client-side room management UI  
**Result:** Users can create and join rooms via UI

---

### Stage 2 — Signalling Server

**Status:** Completed  
**Goal:** WebSocket server for SFU signalling  
**Result:** Signalling server ready (SFU uses `/sfu` namespace)

---

### Stage 2.5 — Socket.io Client

**Status:** Completed  
**Goal:** Frontend WebSocket connection management  
**Result:** Client can connect to signalling server

---

### Stage 3 — Media Stream Access

**Status:** Completed  
**Goal:** Camera/microphone access and local media management  
**Result:** Local media stream management working

---

### Stage 4 — Device Management

**Status:** Completed  
**Goal:** Switch between cameras, microphones, speakers  
**Result:** User can select input/output devices

---

### Stage 5 — SFU (Group Calls)

**Status:** Completed  
**Goal:** Scalable group calls (3-10+ participants) via mediasoup  
**Result:** Group video calls working

---

### Stage 6 — Call UX

**Status:** Completed  
**Goal:** Canonical room entry flow and adaptive in-call experience  
**Result:** Room link supports pre-join, active call, and ended states; participant and media UX work predictably

---

See [tasks/done/README.md](./tasks/done/README.md) for milestone details.

---

## In Progress

### Stage 7 — Deployment

**Status:** In Progress  
**Goal:** Production-ready deployment with HTTPS, TURN, and media connectivity outside localhost  
**Result:** Application available via HTTPS on a VPS, media works through NAT with TURN fallback

---

## Backlog

### Stage 8 — Screen Share

**Status:** Planned  
**Goal:** Desktop/application window sharing  
**Result:** Screen sharing capability

---

### Stage 9 — Chat

**Status:** Planned  
**Goal:** Real-time text chat with history  
**Result:** Working chat with history

---

### Stage 10 — Quality

**Status:** Planned  
**Goal:** Network monitoring and adaptation  
**Result:** Stable connection with quality indicators

---

### Stage 11 — Future Enhancements

**Status:** Planned  
**Goal:** UX improvements and additional features  
**Result:** Enhanced user experience (e2e tests, error boundaries, dark mode, accessibility, etc.)

---

### Stage 12 — CI/CD

**Status:** Planned  
**Goal:** Automated CI/CD pipeline  
**Result:** GitHub Actions with automated tests and deployment

---

### Stage 13 — Simplify Room Creation

**Status:** Planned  
**Goal:** Improve room creation UX  
**Result:** Simplified room creation flow

---

## Timeline

| Stage | Status | Estimate |
|-------|--------|----------|
| Stage 0 | Completed | 1-2 days |
| Stage 0.5 | Completed | 2-3 days |
| Stage 1 | Completed | 3-5 days |
| Stage 1.5 | Completed | 1-2 days |
| Stage 2 | Completed | 2-3 days |
| Stage 2.5 | Completed | 1 day |
| Stage 3 | Completed | 3-4 days |
| Stage 4 | Completed | 1-2 days |
| Stage 5 | Completed | 5-7 days |
| Stage 6 | Completed | 3-5 days |
| Stage 7 | In Progress | 2-3 days |
| Stage 8 | Planned | 1-2 days |
| Stage 9 | Planned | 2-3 days |
| Stage 10 | Planned | 2-3 days |
| Stage 11 | Planned | TBD |
| Stage 12 | Planned | 1-2 days |
| Stage 13 | Planned | 1 day |

**MVP Path:** Stages 0-6 = 2-3 weeks (completed)

---

## Architecture Note

> The project uses an **SFU-only architecture** (mediasoup) for all video calls.

---

## Next Steps

1. **Stage 7** — mediasoup network config → coturn → ICE servers → deploy checklist
2. See [tasks/in-progress/](./tasks/in-progress/) for active work
3. See [tasks/backlog/](./tasks/backlog/) for planned work
4. Refer to [SDD](./SDD.md) for architecture decisions
