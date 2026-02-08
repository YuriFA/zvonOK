# Gateway Module (WebRTC Signalling)

## Purpose

WebSocket server for real-time WebRTC signalling. Manages room membership and exchanges offers, answers, and ICE candidates between peers.

---

## Use Cases

### 1. Join Room
- Client sends `join:room` with room code
- Server validates room exists
- Server adds socket to room
- Server sends `room:joined` with peer list
- Server broadcasts `peer:joined` to existing peers

### 2. Leave Room
- Client sends `leave:room` or disconnects
- Server removes socket from room
- Server broadcasts `peer:left` to remaining peers

### 3. WebRTC Offer
- Client creates `RTCPeerConnection` and offer
- Client sends `webrtc:offer` with target peer
- Server forwards offer to target peer

### 4. WebRTC Answer
- Target peer sends `webrtc:answer` to caller
- Server forwards answer to caller

### 5. ICE Candidate
- Peer sends `webrtc:ice` with candidate
- Server forwards to target peer

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join:room` | Client → Server | `{ roomCode: string }` | Join a room |
| `leave:room` | Client → Server | — | Leave current room |
| `room:joined` | Server → Client | `{ roomId, peerId, peers[] }` | Room joined confirmation |
| `peer:joined` | Server → Client | `{ peerId, userInfo }` | New peer joined |
| `peer:left` | Server → Client | `{ peerId }` | Peer left room |
| `webrtc:offer` | Bidirectional | `{ targetPeerId, offer }` | WebRTC offer |
| `webrtc:answer` | Bidirectional | `{ targetPeerId, answer }` | WebRTC answer |
| `webrtc:ice` | Bidirectional | `{ targetPeerId, candidate }` | ICE candidate |

### Payload Examples

**join:room**
```json
{
  "roomCode": "ABC123"
}
```

**room:joined**
```json
{
  "roomId": "room_abc123",
  "peerId": "socket_xyz789",
  "peers": [
    {
      "id": "socket_def456",
      "userInfo": {
        "username": "alice"
      }
    }
  ]
}
```

**webrtc:offer**
```json
{
  "targetPeerId": "socket_def456",
  "offer": {
    "type": "offer",
    "sdp": "v=0\r\n..."
  }
}
```

**webrtc:ice**
```json
{
  "targetPeerId": "socket_def456",
  "candidate": "candidate:1 1 UDP 2130706431 192.168.1.1 54321 typ host"
}
```

---

## Configuration

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
```

---

## Edge Cases

### Room Not Found
- Send error response to client
- Client should create room or check code

### Target Peer Not Found
- Send error response to client
- Target peer may have disconnected

### Authentication Required

**Implementation Pattern for NestJS Socket.io Authentication:**

NestJS uses a middleware-based approach for Socket.io authentication. The JWT is extracted from HTTP-only cookies during the WebSocket handshake.

```typescript
// Gateway configuration with authentication
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Required for HTTP-only cookies
  },
  namespace: '/',
})
export class WebrtcGateway implements OnGatewayInit {
  constructor(private jwtService: JwtService) {}

  // Authentication middleware
  async handleConnection(client: Socket) {
    try {
      // Extract JWT from cookies in handshake
      const cookies = client.handshake.headers.cookie;
      const token = this.extractTokenFromCookies(cookies, 'access_token');

      if (!token) {
        client.disconnect();
        return;
      }

      // Verify token using JwtService
      const payload = this.jwtService.verify(token);

      // Attach user info to socket for use in event handlers
      client.data.user = payload;
      client.data.userId = payload.sub;

      // Optionally join user-specific room
      await client.join(`user:${payload.sub}`);
    } catch (error) {
      // Invalid token - disconnect
      client.disconnect();
    }
  }

  private extractTokenFromCookies(cookieHeader: string, cookieName: string): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const targetCookie = cookies.find(c => c.startsWith(`${cookieName}=`));
    return targetCookie ? targetCookie.split('=')[1] : null;
  }

  @SubscribeMessage('join:room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, payload: JoinRoomDto) {
    // User is authenticated (otherwise they'd be disconnected)
    const userId = client.data.userId;
    // ... rest of join logic
  }
}
```

**Alternative: Using Socket.io Middleware (Cleaner Approach):**

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WebrtcGateway {
  @WebSocketMiddleware()
  async authenticate(socket: Socket, next: (err?: Error) => void) {
    try {
      const cookies = socket.handshake.headers.cookie;
      const token = this.extractTokenFromCookies(cookies, 'access_token');

      if (!token) {
        return next(new Error('Authentication error: No token'));
      }

      const payload = this.jwtService.verify(token);
      socket.data.user = payload;
      socket.data.userId = payload.sub;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  }
}
```

**Key Points:**
- JWT is stored in HTTP-only cookies (same as REST API)
- Extract cookie from `socket.handshake.headers.cookie`
- Use `JwtService` from `@nestjs/jwt` to verify token
- Attach user info to `socket.data` for later use
- Disconnect immediately on authentication failure
- CORS `credentials: true` is required for cookie transmission

### Max Room Size
- Limit rooms to 10 participants for P2P
- Route to SFU for larger groups

---

## Files

- `apps/server/src/gateway/webrtc.gateway.ts` — Gateway class
- `apps/server/src/gateway/webrtc.module.ts` — Module definition
- `apps/server/src/gateway/interfaces/` — Type definitions
