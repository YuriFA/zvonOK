# WebRTC Chat Client

React 19 + Vite frontend with WebRTC video chat and Socket.io signalling.

## Quick Start

```bash
# Configure env
cp .env.example .env.local
# Edit .env.local: add VITE_SOCKET_URL

# Run dev server
pnpm dev
```

Client: http://localhost:5173

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite dev server with HMR |
| `pnpm build` | TypeScript check + production build |
| `pnpm lint` | ESLint check |
| `pnpm preview` | Preview production build |

## Architecture

- **Routing:** React Router v7 (file-based in `src/routes/`)
- **UI:** Radix UI primitives (Shadcn) in `src/components/ui/`
- **Styling:** Tailwind CSS v4 with CSS variables
- **Forms:** React Hook Form + Zod validation
- **WebRTC:** Socket.io for signalling + native WebRTC for P2P

### WebRTC Flow

1. Connect to Socket.io server
2. Join room -> create `RTCPeerConnection` on participant joined
3. Exchange Offer/Answer/ICE candidates via Socket.io
4. Use MediaStream API for video/audio

## Project Structure

```
src/
├── main.tsx          # Entry point, React Router setup
├── routes/           # File-based routing (lobby.tsx, room.tsx)
├── components/ui/    # Radix UI components (button.tsx, input.tsx)
└── lib/
    ├── config.ts     # WebRTC config (STUN servers, constraints)
    └── utils.ts      # Utilities (cn helper)
```

## Environment Variables

```bash
VITE_SOCKET_URL=http://localhost:3000
```

## Tech Stack

| Tech | Version | Purpose |
|------|---------|---------|
| React | 19.1.1 | UI framework |
| Vite | 7.1.6 | Build tool + dev server |
| TypeScript | 5.8.3 | Typing |
| React Router | 7.9.1 | Routing |
| Tailwind CSS | 4.1.13 | Styling |
| Socket.io Client | - | WebRTC signalling |
