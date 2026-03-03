# Chat Module

## Purpose

Real-time text chat within video conference rooms. Delivers messages via WebSocket with persistent history stored in PostgreSQL.

---

## Use Cases

### 1. Send Message
- Authenticated user sends a message to the current room
- Server broadcasts message to all peers in the room via WebSocket
- Message persisted to database for history

### 2. Receive Messages
- All peers in the room receive new messages in real time
- Messages include sender username and timestamp

### 3. Load Chat History
- When a user joins a room, fetch message history via REST
- Paginated: newest messages first, default limit 50

---

## Domain Model

### Message Entity

| Field | Type | Constraints |
|-------|------|-------------|
| id | String | Primary Key, `cuid()` |
| content | String | Max 2000 characters |
| userId | String | Foreign Key to User (cascade delete) |
| roomId | String | Foreign Key to Room (cascade delete) |
| createdAt | DateTime | `now()` |

### Prisma Schema

```prisma
model Message {
  id        String   @id @default(cuid())
  content   String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([roomId])
  @@index([userId])
}
```

> **Note:** Requires updating `User` and `Room` models with `messages Message[]` relation. Added in Stage 6.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rooms/:slug/messages` | Protected | Get chat history for room |
| POST | `/api/rooms/:slug/messages` | Protected | Send a message to room |

### Request/Response Examples

**GET /api/rooms/:slug/messages**
```json
// Response 200
{
  "messages": [
    {
      "id": "clx...",
      "content": "Hello everyone!",
      "createdAt": "2024-01-01T12:00:00Z",
      "user": {
        "id": "clx...",
        "username": "alice"
      }
    }
  ],
  "total": 42,
  "hasMore": false
}
```

**POST /api/rooms/:slug/messages**
```json
// Request
{
  "content": "Hello everyone!"
}

// Response 201
{
  "id": "clx...",
  "content": "Hello everyone!",
  "createdAt": "2024-01-01T12:00:00Z",
  "user": {
    "id": "clx...",
    "username": "alice"
  }
}
```

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat:message` | Client → Server | `{ content: string }` | Send a message |
| `chat:message` | Server → Client | `{ id, content, createdAt, user }` | New message broadcast |
| `chat:history` | Server → Client | `{ messages[] }` | History sent on room join |

### Payload Examples

**Incoming broadcast (`chat:message`):**
```json
{
  "id": "clx...",
  "content": "Hello everyone!",
  "createdAt": "2024-01-01T12:00:00Z",
  "user": {
    "id": "clx...",
    "username": "alice"
  }
}
```

**History on join (`chat:history`):**
```json
{
  "messages": [
    {
      "id": "clx...",
      "content": "Hi!",
      "createdAt": "2024-01-01T11:00:00Z",
      "user": { "id": "clx...", "username": "bob" }
    }
  ]
}
```

---

## Edge Cases

### Room Not Found
- Returns 404 if room slug doesn't exist

### User Not in Room
- WebSocket `chat:message` from a socket not in the room is silently dropped

### Message Too Long
- Content exceeding 2000 characters returns 400 Bad Request

### Empty Message
- Content must be non-empty string; empty strings return 400 Bad Request

### Room Ended
- Sending to an ended room returns 403 Forbidden

---

## Files

- `apps/server/src/chat/chat.service.ts` — Business logic (save, query messages)
- `apps/server/src/chat/chat.controller.ts` — REST endpoints
- `apps/server/src/chat/chat.gateway.ts` — WebSocket event handlers
- `apps/server/src/chat/chat.module.ts` — Module definition
- `apps/server/src/chat/dto/` — CreateMessageDto
