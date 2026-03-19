# C4 Level 1 — System Context

> Кто использует систему и с какими внешними системами она взаимодействует.

```mermaid
C4Context
    title WebRTC Chat — System Context

    Person(user, "User", "Registered user: creates rooms, joins video calls, manages profile")
    Person(guest, "Guest", "Unauthenticated visitor: views public room info, joins by invite link")

    System(webrtcChat, "WebRTC Chat", "Browser-based video conferencing: authentication, rooms, group video/audio calls via SFU")

    System_Ext(stun, "Google STUN Servers", "stun1/stun2.l.google.com:19302 — discovers public IP and NAT mapping for ICE candidate gathering")
    System_Ext(turn, "coturn TURN Server", "Self-hosted relay server on ports 3478/5349 — relays media when direct P2P is blocked by symmetric NAT or firewall")
    System_Ext(browser, "WebRTC Browser API", "Native RTCPeerConnection / MediaDevices API provided by the user's browser — captures camera/mic, negotiates DTLS/SRTP")
    System_Ext(ghcr, "GitHub Container Registry", "Stores Docker images (server, client, migrator) for CI/CD deployment")
    System_Ext(github, "GitHub Actions CI/CD", "Runs lint, tests, Docker build checks and deploys to VPS on push to main")

    Rel(user, webrtcChat, "Registers, logs in, creates/joins rooms, makes video calls", "HTTPS / WSS")
    Rel(guest, webrtcChat, "Joins room by invite slug", "HTTPS")

    Rel(webrtcChat, stun, "Gathers ICE candidates", "STUN/UDP")
    Rel(webrtcChat, turn, "Relays media when direct path fails", "TURN/UDP+TCP / TURNS/TLS")
    Rel(webrtcChat, browser, "Captures media, handles DTLS/SRTP", "Browser API")

    Rel(github, webrtcChat, "Deploys via SSH + docker compose", "SSH")
    Rel(github, ghcr, "Pushes / pulls images", "HTTPS")
    Rel(webrtcChat, ghcr, "Pulls production images", "HTTPS")
```

## Text Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL ACTORS                             │
│                                                                     │
│   [User]                              [Guest]                       │
│   Registered user                     Unauthenticated visitor       │
│   (auth, rooms, video calls)          (join by invite slug)         │
└────────────────────┬──────────────────────────┬────────────────────┘
                     │ HTTPS / WSS               │ HTTPS
                     ▼                           ▼
         ┌───────────────────────────────────────────────┐
         │                                               │
         │              WebRTC Chat                      │
         │   Browser-based video conferencing            │
         │   (Auth · Rooms · SFU video calls)            │
         │                                               │
         └──────┬──────────────┬────────────────┬────────┘
                │ STUN/UDP     │ TURN/UDP+TCP    │ HTTPS
                ▼              ▼                 ▼
   [Google STUN Servers]  [coturn TURN]    [GitHub GHCR]
   ICE candidate          Self-hosted      Docker image
   gathering              media relay      registry
   stun1/stun2            ports 3478/5349

         ▲
         │ SSH deploy
   [GitHub Actions CI/CD]
   lint · tests · build · deploy to VPS
```

## External Actors

| Actor | Description |
|-------|-------------|
| **User** | Registered user — full access: authentication, room management, video calls |
| **Guest** | Unauthenticated visitor — can view public room info and join by invite link |

## External Systems

| System | Role |
|--------|------|
| **Google STUN** | ICE candidate gathering — discovers public IP/port |
| **coturn TURN** | Media relay when direct WebRTC path is blocked by NAT/firewall |
| **Browser WebRTC API** | Camera/mic capture, DTLS-SRTP encryption, ICE negotiation |
| **GitHub Actions** | CI (lint, test, Docker build) + CD (build images, SSH deploy) |
| **GHCR** | Docker image registry for server/client/migrator images |
