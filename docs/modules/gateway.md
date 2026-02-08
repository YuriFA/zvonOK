# Gateway Module (WebRTC Signalling)

## Purpose

WebSocket server for real-time WebRTC signalling. Manages room membership and exchanges offers, answers, and ICE candidates between peers.

## Domain Model

### Room State (In-Memory)

```typescript
interface RoomState {
  id: string;
  code: string;
  peers: Map<peerId, PeerInfo>;
}

interface PeerInfo {
  id: string;           // socket.id
  userId?: string;      // Authenticated user ID
  userInfo?: {
    username: string;
  };
}
```

### Socket State

```typescript
interface SocketData {
  userId?: string;
  currentRoom?: string;
}
```

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
- Target peer sets remote description and creates answer

### 4. WebRTC Answer
- Target peer sends `webrtc:answer` to caller
- Server forwards answer to caller
- Caller sets remote description

### 5. ICE Candidate
- Peer sends `webrtc:ice` with candidate
- Server forwards to target peer
- Target peer adds candidate to connection

## API Contracts

### WebSocket Events

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

## Edge Cases

### 1. Room Not Found
- Send error response to client
- Client should create room or check code

### 2. Target Peer Not Found
- Send error response to client
- Target peer may have disconnected

### 3. Authentication Required (Future)
- Verify JWT from socket handshake
- Associate socket with user ID
- Allow only authenticated users to join

### 4. Max Room Size (Future)
- Limit rooms to 10 participants for P2P
- Route to SFU for larger groups

## Implementation Details

### Gateway Configuration

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class WebrtcGateway {
  @WebSocketServer()
  server: Server;

  private rooms = new Map<string, RoomState>();
}
```

### Room Management

```typescript
// Join room
@SubscribeMessage('join:room')
handleJoinRoom(
  @MessageBody() data: { roomCode: string },
  @ConnectedSocket() client: Socket,
) {
  const room = this.getOrCreateRoom(data.roomCode);
  room.peers.set(client.id, { id: client.id });

  client.join(room.id);
  client.data.currentRoom = room.id;

  // Notify client
  client.emit('room:joined', {
    roomId: room.id,
    peerId: client.id,
    peers: Array.from(room.peers.values()),
  });

  // Notify others
  client.to(room.id).emit('peer:joined', {
    peerId: client.id,
  });
}

// Leave room
handleLeave(@ConnectedSocket() client: Socket) {
  const roomCode = client.data.currentRoom;
  if (roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.peers.delete(client.id);
      client.to(room.id).emit('peer:left', { peerId: client.id });
    }
    client.leave(roomCode);
  }
}
```

### WebRTC Signalling

```typescript
@SubscribeMessage('webrtc:offer')
handleOffer(
  @MessageBody() data: { targetPeerId: string; offer: RTCSessionDescriptionInit },
  @ConnectedSocket() client: Socket,
) {
  const target = this.server.sockets.get(data.targetPeerId);
  if (target) {
    target.emit('webrtc:offer', {
      from: client.id,
      offer: data.offer,
    });
  }
}

@SubscribeMessage('webrtc:answer')
handleAnswer(
  @MessageBody() data: { targetPeerId: string; answer: RTCSessionDescriptionInit },
  @ConnectedSocket() client: Socket,
) {
  const target = this.server.sockets.get(data.targetPeerId);
  if (target) {
    target.emit('webrtc:answer', {
      from: client.id,
      answer: data.answer,
    });
  }
}

@SubscribeMessage('webrtc:ice')
handleIceCandidate(
  @MessageBody() data: { targetPeerId: string; candidate: RTCIceCandidateInit },
  @ConnectedSocket() client: Socket,
) {
  const target = this.server.sockets.get(data.targetPeerId);
  if (target) {
    target.emit('webrtc:ice', {
      from: client.id,
      candidate: data.candidate,
    });
  }
}
```

### Lifecycle Hooks

```typescript
afterInit(server: Server) {
  console.log('WebSocket server initialized');
}

handleConnection(client: Socket) {
  console.log('Client connected:', client.id);
}

handleDisconnect(client: Socket) {
  console.log('Client disconnected:', client.id);
  this.handleLeave(client);
}
```

## Files

- `apps/server/src/gateway/webrtc.gateway.ts` - Gateway class
- `apps/server/src/gateway/webrtc.module.ts` - Module definition
- `apps/server/src/gateway/interfaces/` - Type definitions
