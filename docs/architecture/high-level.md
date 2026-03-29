# High-Level Architecture

> Верхнеуровневый обзор взаимодействия клиентов, сервера и базы данных.

```mermaid
flowchart TB
    subgraph Clients["Browser Clients"]
        C1[Client 1]
        C2[Client 2]
        C3[Client 3]
    end

    subgraph Server["NestJS Server"]
        API[REST API]
        WS[WebSocket Gateway]
        SFU[mediasoup SFU]
    end

    subgraph Database["PostgreSQL + Prisma"]
        DB[(Database)]
    end

    C1 <-->|HTTP/WebSocket| Server
    C2 <-->|HTTP/WebSocket| Server
    C3 <-->|HTTP/WebSocket| Server

    API <-->|Prisma ORM| DB
    WS <-->|Prisma ORM| DB

    C1 <-->|via SFU| SFU
    C2 <-->|via SFU| SFU
    C3 <-->|via SFU| SFU
```

## Text Diagram

```
┌──────────────────────────────────────────┐
│             Browser Clients              │
│                                          │
│   [Client 1]  [Client 2]  [Client 3]    │
└────────┬────────────┬────────────┬───────┘
         │            │            │
         │   HTTP / WebSocket      │
         ▼            ▼            ▼
┌──────────────────────────────────────────┐
│              NestJS Server               │
│                                          │
│  ┌──────────┐  ┌─────────────────────┐  │
│  │ REST API │  │ WebSocket Gateway   │  │
│  │ /*      │  │ /sfu namespace      │  │
│  └────┬─────┘  └──────────┬──────────┘  │
│       │                   │             │
│       │         ┌─────────▼──────────┐  │
│       │         │  mediasoup SFU     │  │
│       │  │  (Workers × 1)     │  │
│       │         └────────────────────┘  │
└───────┼───────────────────────────────── ┘
        │ Prisma ORM (TCP :5432)
        ▼
┌──────────────────────────────────────────┐
│         PostgreSQL + Prisma              │
│                                          │
│              [(Database)]               │
│         users · rooms                    │
└──────────────────────────────────────────┘

Media flow (RTP/SRTP — bypasses REST/WS path):
  Client 1 ──► SFU ──► Client 2
  Client 1 ──► SFU ──► Client 3
```

## Component Overview

| Component | Description | Location |
|-----------|-------------|----------|
| **REST API** | Auth, user, and room management endpoints | `apps/server/src/auth/`, `user/`, `room/` |
| **WebSocket Gateway** | SFU signalling via Socket.io `/sfu` namespace | `apps/server/src/sfu/` |
| **mediasoup SFU** | Single Worker routing media for group calls | `apps/server/src/sfu/` |
| **PostgreSQL** | Persistent storage for users and rooms | Docker service, accessed via Prisma |
| **Browser Clients** | React SPA — auth, room UI, SFU client | `apps/client/src/` |

## Communication Protocols

| Path | Protocol | Purpose |
|------|----------|---------|
| Client → Server (REST) | HTTPS / HTTP/JSON + cookies | Auth, room CRUD, user profile |
| Client → Server (WS) | WSS / Socket.io | SFU signalling (join, transport, produce, consume) |
| Client ↔ SFU | RTP/SRTP over UDP | Media (audio/video) routing through SFU |
| Server → PostgreSQL | TCP (Prisma ORM) | Database reads and writes |
