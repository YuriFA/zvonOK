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

## Features

- User registration & login (JWT with refresh tokens)
- Room creation with shareable link (slug-based)
- Pre-join lobby with device preview
- Group video calls (3-10+ participants via mediasoup SFU)
- Device selection (camera/mic/speaker)
- Mute/unmute, camera toggle
- Active speaker detection
- Call ended state
- Permission denied handling

## Architecture

- **Backend:** NestJS + PostgreSQL + Prisma
- **Frontend:** React 19 + Vite + Tailwind CSS v4
- **WebRTC:** mediasoup SFU
- **Signalling:** Socket.io
