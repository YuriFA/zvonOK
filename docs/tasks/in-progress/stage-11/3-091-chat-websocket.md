# TASK-091 — Real-time Chat via WebSocket

> **Status:** planned
> **Priority:** medium
> **Created:** 2026-02-08

---

## Description
Implement a dedicated `ChatGateway` with Socket.io events for real-time chat message delivery within rooms.

## Scope
- Create `ChatGateway` in `apps/server/src/chat/` (separate from `SfuGateway`)
- `chat:send` event — client sends a message
- `chat:history` event — client requests message history on join
- `chat:message` broadcast — server pushes new message to room
- Message persistence via `ChatService`
- Room-based message routing

## Technical Design

### Architecture
Create a dedicated `ChatGateway` on the `/chat` namespace (do **not** add chat events to `SfuGateway` — SRP violation). Use `ChatService` for all DB operations; never call Prisma directly from the gateway.

### Socket Events

**Client → Server:**
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:send` | `{ roomId, content }` | Send a new message |
| `chat:history` | `{ roomId }` | Request message history for room |

**Server → Client:**
| Event | Payload | Description |
|-------|---------|-------------|
| `chat:message` | `Message` | New message broadcast to room |
| `chat:history` | `Message[]` | History response |

### Implementation Sketch
```typescript
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*', credentials: true } })
export class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('chat:send')
  async handleSend(client: Socket, payload: { roomId: string; content: string }) {
    const userId = client.data.userId; // set by auth guard
    const message = await this.chatService.createMessage({ userId, ...payload });
    this.server.to(payload.roomId).emit('chat:message', message);
  }

  @SubscribeMessage('chat:history')
  async handleHistory(client: Socket, { roomId }: { roomId: string }) {
    return this.chatService.getHistory(roomId);
  }
}
```

## Acceptance Criteria
- `ChatGateway` created in `apps/server/src/chat/`
- Messages sent via `chat:send` event
- Messages saved to database via `ChatService`
- New messages broadcast as `chat:message` to room
- History returned via `chat:history`
- Auth guard applied (userId from JWT cookie)

## Definition of Done
- Socket events working
- Database persistence confirmed
- Real-time delivery working
- History loading functional

## Implementation Guide

## Related Files
- `apps/server/src/chat/chat.gateway.ts` (new)
- `apps/server/src/chat/chat.service.ts` (new)
- `apps/server/src/chat/chat.module.ts` (new)
- `apps/server/src/sfu/sfu.gateway.ts` (reference for gateway patterns)
