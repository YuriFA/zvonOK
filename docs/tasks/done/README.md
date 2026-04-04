# v0.1.0-alpha — MVP Release

**Date:** 2026-03-22

## Scope

Group video calls with authentication and room management.

## Completed Stages

| Stage | Description | Result |
|-------|-------------|--------|
| 0 | Theory | WebRTC fundamentals understood |
| 0.5 | Frontend Auth | Login/register UI, auth context |
| 1 | Backend | NestJS + Prisma + JWT auth |
| 1.5 | Client Rooms | Room creation/join UI |
| 2 | Signalling Server | Socket.io for SFU signalling |
| 2.5 | Socket.io Client | Frontend WS connection |
| 3 | Media Stream Access | Camera/mic access, controls |
| 4 | Device Management | Device selection UI |
| 5 | SFU (Group Calls) | mediasoup integration |
| 6 | Call UX | Pre-join, active call, ended states |
| 7 | Deployment | HTTPS on VPS, TURN fallback, Docker |
| 8 | Polish & Infrastructure | UX polish, audio/visual enhancements, CI/CD |

## Features

### MVP (Stages 0–7)

- User registration & login (JWT with refresh tokens)
- Room creation with shareable link (slug-based)
- Pre-join lobby with device preview
- Group video calls (3-10+ participants via mediasoup SFU)
- Device selection (camera/mic/speaker)
- Mute/unmute, camera toggle
- Active speaker detection
- Call ended state
- Permission denied handling

### Polish & Infrastructure (Stage 8)

- User roles (USER/HOST/ADMIN) with role-based room creation
- Simplified room creation (no modal, instant)
- Toast notifications (accessible)
- Prejoin device controls redesign (compact layout)
- Display name in prejoin (authenticated + guest)
- Independent device permission handling
- Remote audio via Web Audio API mixer
- Avatar pastel colors for video-off participants
- Audio level concentric rings around avatars
- SOLID audio level sampler refactor
- App versioning (client + server, release-it)
- CI/CD pipeline (GitHub Actions + GHCR + VPS deploy)
- Framework-agnostic client architecture
- UI migration from Radix to Base UI

## Architecture

- **Backend:** NestJS + PostgreSQL + Prisma
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + Base UI
- **WebRTC:** mediasoup SFU
- **Signalling:** Socket.io
- **CI/CD:** GitHub Actions + GHCR + Docker Compose
