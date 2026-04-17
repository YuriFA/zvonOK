# TASK-033 — Chat API Endpoints

> **Status:** done
> **Priority:** medium
> **Created:** 2026-02-08

---

## Description
Create REST API endpoints for chat functionality to send messages and retrieve chat history.

## Scope
- POST /messages - Send message
- GET /messages/:roomId - Get message history
- Pagination support
- Include user data in responses
- Rate limiting

## Technical Design

### Endpoints
```http
POST   /messages
GET    /messages/:roomId?page=1&limit=50
```

### DTOs
```typescript
class SendMessageDto {
  @IsString()
  content: string;

  @IsString()
  roomId: string;
}
```

## Acceptance Criteria
- POST creates message in database
- GET returns paginated history
- User data included in responses
- Rate limiting configured

## Definition of Done
- All endpoints working
- Pagination functional
- Rate limiting active
- Tests passing

## Implementation Guide

### Files Created
- `apps/server/src/chat/chat.module.ts` — Module registration
- `apps/server/src/chat/chat.controller.ts` — POST /messages, GET /messages/:roomId
- `apps/server/src/chat/chat.service.ts` — Prisma-based message CRUD + pagination
- `apps/server/src/chat/dto/send-message.dto.ts` — Input validation (content 1-2000 chars, roomId)
- `apps/server/src/chat/chat.service.spec.ts` — 11 service unit tests
- `apps/server/src/chat/chat.controller.spec.ts` — 6 controller unit tests

### Key Decisions
- Rate limiting: 30 messages/min on POST (short throttle tier), GET uses global throttle
- Pagination: default page=1, limit=50, max limit=100, ordered by createdAt desc
- Responses include user `{ id, username }` via Prisma include
- GET endpoint requires auth (default JwtAuthGuard); no SkipAuthGuard
- Registered ChatModule in AppModule

## Related Files
- `apps/server/src/chat/chat.module.ts` (new)
- `apps/server/src/chat/chat.controller.ts` (new)
- `apps/server/src/chat/chat.service.ts` (new)
- `apps/server/src/chat/dto/send-message.dto.ts` (new)
- `apps/server/src/chat/chat.service.spec.ts` (new)
- `apps/server/src/chat/chat.controller.spec.ts` (new)
- `apps/server/src/app.module.ts` (modified — added ChatModule)
