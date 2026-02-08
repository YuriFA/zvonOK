# Client Module (React Frontend)

## Purpose

React 19 + Vite frontend for the WebRTC chat application. Handles user authentication, room management, WebRTC connections, and UI rendering.

## Domain Model

### Routing

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | `LobbyPage` | No | Main lobby, create/join rooms |
| `/login` | `LoginPage` | No (redirect if auth) | Email/password login |
| `/register` | `RegisterPage` | No (redirect if auth) | User registration |
| `/room/:code` | `RoomPage` | Optional | Video call interface |

### Global State

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

## Use Cases

### 1. User Authentication Flow
- User visits `/` or `/room/:code`
- If not authenticated, show login/register options
- After login, store user in AuthContext
- Auto-refresh access token before expiration

### 2. Room Management
- User creates room (generates random code)
- User joins room by code
- Display active rooms (future: user's rooms list)

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

## UI Components

### Radix UI Primitives

Located in `apps/client/src/components/ui/`:

| Component | Variants | Purpose |
|-----------|----------|---------|
| `Button` | primary, secondary, outline, ghost | Action buttons |
| `Input` | text, email, password | Form inputs |
| `Card` | — | Content container |
| `Label` | — | Form labels with accessibility |

### Page Components

**LobbyPage** (`src/routes/lobby.tsx`)
- Room creation form
- Room join form
- Auth-aware navigation

**LoginPage** (`src/routes/login.tsx`)
- Email/password form
- Link to registration
- Error display

**RegisterPage** (`src/routes/register.tsx`)
- Email, username, password form
- Password confirmation
- Link to login

**RoomPage** (`src/routes/room.tsx`)
- Video grid layout
- Media controls (mute, camera, screen share)
- Participant list
- Chat panel (future)

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

**ChatPanel** (`src/components/ChatPanel.tsx` - planned)
- Message list
- Message input
- Message history via API

## API Contracts

### Auth API Client

```typescript
class AuthApi {
  private baseUrl: string;
  private accessToken: string | null = null;

  async register(data: {
    email: string;
    username: string;
    password: string;
  }): Promise<User>;

  async login(email: string, password: string): Promise<User>;
  async logout(): Promise<void>;
  async refreshToken(): Promise<User>;
  async getCurrentUser(): Promise<User>;

  // Auto-refresh on 401
  private fetchWithAuth(url: string, options?: RequestInit): Promise<Response>;
}
```

### HTTP Endpoints Consumed

| Method | Path | Usage |
|--------|------|-------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/users/me` | Get current user |
| GET | `/api/rooms/:slug` | Get room info |
| POST | `/api/rooms` | Create new room |

### WebSocket Events (Emitted)

| Event | Payload | Description |
|-------|---------|-------------|
| `join:room` | `{ roomCode }` | Join a room |
| `leave:room` | — | Leave current room |
| `webrtc:offer` | `{ targetPeerId, offer }` | WebRTC offer |
| `webrtc:answer` | `{ targetPeerId, answer }` | WebRTC answer |
| `webrtc:ice` | `{ targetPeerId, candidate }` | ICE candidate |

### WebSocket Events (Received)

| Event | Payload | Handler |
|-------|---------|---------|
| `room:joined` | `{ roomId, peerId, peers[] }` | Room join success |
| `peer:joined` | `{ peerId, userInfo }` | New peer arrived |
| `peer:left` | `{ peerId }` | Peer departed |
| `webrtc:offer` | `{ from, offer }` | Incoming offer |
| `webrtc:answer` | `{ from, answer }` | Incoming answer |
| `webrtc:ice` | `{ from, candidate }` | ICE candidate |

## Edge Cases

### 1. Token Refresh Failure
- Auto-logout user
- Redirect to login page
- Clear local state

### 2. WebSocket Disconnect
- Show connection status indicator
- Attempt reconnection (Socket.io auto)
- Re-join room on reconnect

### 3. WebRTC Connection Failure
- Display error message
- Fallback to audio-only
- Offer TURN server retry

### 4. Device Permission Denied
- Show error message with instructions
- Allow retry after granting permission
- Handle no devices available

### 5. Screen Share Not Supported
- Hide screen share button
- Check `navigator.mediaDevices.getDisplayMedia` availability

## Implementation Details

### WebRTC P2P Manager

```typescript
class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private socket: Socket;

  config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ],
  };

  async startLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.config);

    // Add local tracks
    this.localStream?.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream!);
    });

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice', {
          targetPeerId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Remote stream
    pc.ontrack = (event) => {
      // Handle remote stream
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  async createOffer(peerId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('No peer connection');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(
    peerId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) throw new Error('No peer connection');
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
  }
}
```

### Device Management

```typescript
class DeviceManager {
  async getDevices(): Promise<MediaDeviceInfo[]> {
    return await navigator.mediaDevices.enumerateDevices();
  }

  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }

  async getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(d => d.kind === 'videoinput');
  }

  async switchCamera(deviceId: string, stream: MediaStream): Promise<MediaStream> {
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints({
        deviceId: { exact: deviceId },
      });
    }
    return stream;
  }
}
```

## Files

### Structure
```
apps/client/src/
├── routes/              # File-based routing
│   ├── lobby.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── room.tsx
├── components/
│   ├── ui/              # Radix UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Label.tsx
│   ├── VideoGrid.tsx
│   ├── MediaControls.tsx
│   ├── ChatPanel.tsx
│   └── ProfileDropdown.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── api/
│   │   └── auth.ts      # Auth API client
│   ├── webrtc/
│   │   ├── manager.ts   # WebRTCManager
│   │   └── devices.ts   # DeviceManager
│   └── config.ts        # App config
└── main.tsx             # Entry point with Router
```

## Styling

### Tailwind CSS v4 Configuration

Located in `src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary-50: #f0f9ff;
  --color-primary-500: #0ea5e9;
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;

  --color-danger-500: #ef4444;
  --color-danger-600: #dc2626;

  --color-success-500: #22c55e;
  --color-success-600: #16a34a;

  /* Radius */
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

@layer base {
  body {
    @apply bg-background text-foreground;
    font-family: system-ui, -apple-system, sans-serif;
  }
}
```

## Environment Variables

**`.env.local`**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

**Usage**
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const socketUrl = import.meta.env.VITE_SOCKET_URL;
```
