# SFU Module (mediasoup)

## Purpose

Selective Forwarding Unit for scalable group video calls using mediasoup. Routes media streams between 3+ participants when P2P becomes inefficient.

## Domain Model

### mediasoup Hierarchy

```
Worker (OS process)
  └── Router (per room)
      ├── Transport (send)
      │   ├── Producer (incoming track)
      │   └── Consumer (outgoing track)
      └── Transport (receive)
          ├── Producer (incoming track)
          └── Consumer (outgoing track)
```

### Data Structures

```typescript
interface Worker {
  id: string;
  pid: number;
}

interface Router {
  id: string;
  roomId: string;
}

interface Transport {
  id: string;
  direction: 'send' | 'recv';
  iceState: string;
  dtlsState: string;
}

interface Producer {
  id: string;
  userId: string;
  kind: 'audio' | 'video';
  paused: boolean;
}

interface Consumer {
  id: string;
  producerId: string;
  userId: string;
  kind: 'audio' | 'video';
  paused: boolean;
}
```

## Use Cases

### 1. Create Room Router
- On room creation, get or create Worker
- Create Router for the room
- Store Router ID for peer connections

### 2. Join SFU Room
- Create receive Transport for client
- Create send Transport for client
- Exchange DTLS parameters
- Return Transport IDs to client

### 3. Produce Track
- Client creates Producer on send Transport
- Server adds Producer to Router
- Notify other peers about new Producer

### 4. Consume Track
- Client requests to consume a Producer
- Server creates Consumer on receive Transport
- Return Consumer parameters to client

### 5. Handle Transports
- Manage ICE state changes
- Handle DTLS handshake
- Close Transports on disconnect

## API Contracts

### WebSocket Events (SFU-specific)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sfu:join` | Client → Server | `{ roomId, rtpCapabilities }` | Join SFU room |
| `sfu:joined` | Server → Client | `{ sendTransport, recvTransport }` | SFU room joined |
| `sfu:produce` | Client → Server | `{ transportId, kind, rtpParameters }` | Create producer |
| `sfu:producer-created` | Server → Client | `{ producerId, userId, kind }` | New producer |
| `sfu:consume` | Client → Server | `{ producerId, rtpCapabilities }` | Create consumer |
| `sfu:consumer-created` | Server → Client | `{ consumerId, ...params }` | Consumer ready |
| `sfu:pause-producer` | Client → Server | `{ producerId }` | Pause producer |
| `sfu:resume-producer` | Client → Server | `{ producerId }` | Resume producer |

### Payload Examples

**sfu:join**
```json
{
  "roomId": "room_abc123",
  "rtpCapabilities": {
    "codecs": [...],
    "headerExtensions": [...]
  }
}
```

**sfu:joined**
```json
{
  "sendTransport": {
    "id": "transport_xyz",
    "iceParameters": { "usernameFragment": "...", "password": "..." },
    "iceCandidates": [...],
    "dtlsParameters": { "fingerprints": [...] }
  },
  "recvTransport": {
    "id": "transport_def",
    "iceParameters": { "usernameFragment": "...", "password": "..." },
    "iceCandidates": [...],
    "dtlsParameters": { "fingerprints": [...] }
  },
  "existingProducers": [
    { "id": "producer_1", "userId": "user_abc", "kind": "video" }
  ]
}
```

## Edge Cases

### 1. Worker Exceeded
- Create new Worker if max routers per worker reached
- Distribute routers across workers

### 2. Producer Not Found
- Return error when consuming non-existent producer
- Client should handle gracefully

### 3. Bandwidth Constraints
- Limit video bitrate based on available bandwidth
- Pause low-priority consumers if needed

### 4. Transcoding
- If codec mismatch, mediasoup may need to transcode
- Monitor CPU usage

## Implementation Details

### Worker Management

```typescript
@Injectable()
export class SfuService {
  private workers: Map<string, Worker> = new Map();
  private routers: Map<string, Router> = new Map();
  private maxRoutersPerWorker = 4;

  async getOrCreateWorker(): Promise<Worker> {
    for (const [id, worker] of this.workers) {
      const routerIds = Array.from(this.routers.values())
        .filter(r => r.appData.workerId === id);
      if (routerIds.length < this.maxRoutersPerWorker) {
        return worker;
      }
    }
    return this.createWorker();
  }

  async createWorker(): Promise<Worker> {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.logLevel,
      logTags: config.mediasoup.logTags,
      rtcMinPort: config.mediasoup.rtcMinPort,
      rtcMaxPort: config.mediasoup.rtcMaxPort,
    });
    this.workers.set(worker.id, worker);
    return worker;
  }
}
```

### Router Creation

```typescript
async createRouter(roomId: string): Promise<Router> {
  const worker = await this.getOrCreateWorker();
  const mediaCodecs = config.mediasoup.router.mediaCodecs;

  const router = await worker.createRouter({ mediaCodecs });
  router.appData = { roomId, workerId: worker.id };

  this.routers.set(roomId, router);
  return router;
}
```

### Transport Creation

```typescript
async createWebRtcTransport(router: Router): Promise<WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    enableSctp: true,
  });

  return transport;
}
```

### Producer Management

```typescript
async createProducer(
  transport: WebRtcTransport,
  kind: 'audio' | 'video',
  rtpParameters: RtpParameters,
): Promise<Producer> {
  const producer = await transport.produce({
    kind,
    rtpParameters,
  });

  // Notify other peers
  this.server.to(transport.appData.roomId).emit('sfu:producer-created', {
    producerId: producer.id,
    userId: transport.appData.userId,
    kind,
  });

  return producer;
}
```

### Consumer Management

```typescript
async createConsumer(
  router: Router,
  producer: Producer,
  rtpCapabilities: RtpCapabilities,
): Promise<Consumer | null> {
  if (!router.canConsume({ producerId: producer.id, rtpCapabilities })) {
    return null;
  }

  const transport = this.getReceiveTransport(router.appData.roomId);
  const consumer = await transport.consume({
    producerId: producer.id,
    rtpCapabilities,
    paused: true,
  });

  return consumer;
}
```

### Configuration

```typescript
// config.mediasoup
{
  worker: {
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'profile-level-id': '42e01f',
          'packetization-mode': 1,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      { ip: '0.0.0.0', announcedIp: null }, // Set announcedIp to public IP in production
    ],
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
  },
}
```

## Files

- `apps/server/src/sfu/sfu.service.ts` - SFU business logic
- `apps/server/src/sfu/sfu.gateway.ts` - WebSocket handler
- `apps/server/src/sfu/sfu.module.ts` - Module definition
- `apps/server/src/sfu/interfaces/` - Type definitions
- `apps/server/config/mediasoup.config.ts` - mediasoup configuration

## Scaling Strategy

1. **Per-Room Routers**: Each room gets its own Router
2. **Multiple Workers**: Distribute rooms across workers (CPU cores)
3. **Horizontal Scaling**: Load balancer + Redis for WebSocket state sync
4. **Geographic Distribution**: Regional SFUs for reduced latency

## Performance Considerations

- Limit max participants per room to ~50
- Monitor CPU usage per worker
- Implement bitrate adaptation
- Consider transcoding for codec mismatch
- Use simulcast for adaptive quality
