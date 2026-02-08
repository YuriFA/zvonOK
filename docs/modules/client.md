# Client Module (React Frontend)

## Purpose

React 19 + Vite frontend for the WebRTC chat application. Handles user authentication, room management, WebRTC connections, and UI rendering.

---

## Use Cases

### 1. User Authentication Flow
- User visits `/` or `/room/:code`
- If not authenticated, show login/register options
- After login, store user in AuthContext
- Auto-refresh access token before expiration

### 2. Room Management
- User creates room (generates random code)
- User joins room by code
- Display active rooms (user's rooms list)

### 3. WebRTC P2P Connection
- Connect to signalling server via Socket.io
- Join room
- Create RTCPeerConnection for each peer
- Exchange offer/answer/ICE candidates
- Display remote video streams

### 4. SFU Connection (Group Calls)
- Connect to signalling server
- Join SFU room
- Create send/receive Transports
- Produce local audio/video
- Consume remote audio/video

### 5. Media Controls
- Mute/unmute microphone
- Enable/disable camera
- Share/stop sharing screen
- Switch camera/microphone/speaker devices

---

## Routes

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | `LobbyPage` | No | Main lobby, create/join rooms |
| `/login` | `LoginPage` | No (redirect if auth) | Email/password login |
| `/register` | `RegisterPage` | No (redirect if auth) | User registration |
| `/room/:code/lobby` | `RoomLobbyPage` | Optional | Device setup, video preview, share link |
| `/room/:code` | `RoomPage` | Optional | Video call interface |

---

## Global State

**AuthContext**
```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

---

## Components

### UI Components (Radix UI)

Located in `apps/client/src/components/ui/`:

| Component | Variants | Purpose |
|-----------|----------|---------|
| `Button` | primary, secondary, outline, ghost | Action buttons |
| `Input` | text, email, password | Form inputs |
| `Card` | — | Content container |
| `Label` | — | Form labels with accessibility |
| `CopyLink` | — | Copy link to clipboard with visual feedback |

### Feature Components

**AuthContext** (`src/contexts/AuthContext.tsx`)
- Global auth state provider
- Token refresh logic
- Auto-logout on failed refresh

**VideoGrid** (`src/components/VideoGrid.tsx`)
- Adaptive grid layout
- Speaker detection highlight
- Responsive tile sizing

**MediaControls** (`src/components/MediaControls.tsx`)
- Mute/unmute buttons
- Camera toggle
- Screen share
- Device selection
- Leave room

**ChatPanel** (`src/components/ChatPanel.tsx`)
- Message list
- Message input
- Message history via API

**DeviceSelector** (`src/features/media/components/device-selector.tsx`)
- Camera/mic device selection with preview
- Toggle buttons for camera/mute
- Device dropdowns for switching input devices
- Local video preview via getUserMedia

**CopyLink** (`src/components/ui/copy-link.tsx`)
- Reusable copy-to-clipboard component
- Visual feedback ("Copied!" state)
- Shareable room link display

**RoomLobbyPage** (`src/routes/room-lobby.tsx`)
- Pre-room lobby with device setup
- Video preview and device configuration
- Shareable room link
- "Join Room" button to enter call

---

## API Endpoints Consumed

| Method | Path | Usage |
|--------|------|-------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/users/me` | Get current user |
| GET | `/api/rooms/:slug` | Get room info |
| POST | `/api/rooms` | Create new room |

---

## Data Fetching Strategy (React Query)

The client uses `@tanstack/react-query` for server state management, providing automatic cache invalidation, background refetching, and reduced boilerplate.

### Query Keys Structure

**Room Query Keys:**
```typescript
const roomKeys = {
  all: ['rooms'] as const,
  details: () => [...roomKeys.all, 'detail'] as const,
  detail: (slug: string) => [...roomKeys.details(), slug] as const,
} as const;
```

### Cache Invalidation Strategy

| Action | Cache Invalidation |
|--------|-------------------|
| **Create Room** | Pre-populate new room detail in cache |
| **Update Room** | Invalidate `['rooms', 'detail', slug]` |
| **End Room** | Remove `['rooms', 'detail', slug]` from cache |

### React Query Hooks

| Hook | Purpose | Stale Time |
|------|---------|------------|
| `useRoom(slug)` | Fetch single room by slug | 5 minutes |
| `useCreateRoom()` | Create room mutation | - |
| `useEndRoom()` | End room mutation (removes from cache) | - |

### QueryClient Configuration

```typescript
{
  queries: {
    staleTime: 0,           // Global default
    gcTime: 5 * 60 * 1000,  // 5 minutes cache
    retry: 3,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  mutations: {
    retry: 1,
  },
}
```

### Error Handling

- Existing `ApiError`, `ValidationError`, `AuthError` types preserved
- React Query wraps existing `apiClient` (auth refresh logic continues to work)
- Mutations expose `isPending`, `error` states for UI handling

---

## WebSocket Events

### Emitted (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `join:room` | `{ roomCode }` | Join a room |
| `leave:room` | — | Leave current room |
| `webrtc:offer` | `{ targetPeerId, offer }` | WebRTC offer |
| `webrtc:answer` | `{ targetPeerId, answer }` | WebRTC answer |
| `webrtc:ice` | `{ targetPeerId, candidate }` | ICE candidate |

### Received (Server → Client)

| Event | Payload | Handler |
|-------|---------|---------|
| `room:joined` | `{ roomId, peerId, peers[] }` | Room join success |
| `peer:joined` | `{ peerId, userInfo }` | New peer arrived |
| `peer:left` | `{ peerId }` | Peer departed |
| `webrtc:offer` | `{ from, offer }` | Incoming offer |
| `webrtc:answer` | `{ from, answer }` | Incoming answer |
| `webrtc:ice` | `{ from, candidate }` | ICE candidate |

---

## Environment Variables

**`.env.local`**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Edge Cases

### Token Refresh Failure
- Auto-logout user
- Redirect to login page
- Clear local state

### WebSocket Disconnect
- Show connection status indicator
- Attempt reconnection (Socket.io auto)
- Re-join room on reconnect

### WebRTC Connection Failure
- Display error message
- Fallback to audio-only
- Offer TURN server retry

### Device Permission Denied
- Show error message with instructions
- Allow retry after granting permission
- Handle no devices available

### Screen Share Not Supported
- Hide screen share button
- Check `navigator.mediaDevices.getDisplayMedia` availability

---

## Files

```
apps/client/src/
├── routes/              # File-based routing
│   ├── lobby.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── room-lobby.tsx
│   └── room.tsx
├── components/
│   ├── ui/              # Radix UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Label.tsx
│   │   └── copy-link.tsx
│   ├── VideoGrid.tsx
│   ├── MediaControls.tsx
│   ├── ChatPanel.tsx
│   └── ProfileDropdown.tsx
├── contexts/
│   └── AuthContext.tsx
├── features/
│   └── media/
│       └── components/
│           └── device-selector.tsx
├── lib/
│   ├── api/
│   │   └── auth.ts      # Auth API client
│   ├── webrtc/
│   │   ├── manager.ts   # WebRTCManager
│   │   └── devices.ts   # DeviceManager
│   └── config.ts        # App config
└── main.tsx             # Entry point with Router
```
