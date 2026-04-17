# TASK-033 — Chat API Endpoints

> **Status:** planned
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

## Related Files
- `apps/server/src/chat/chat.controller.ts` (new)
- `apps/server/src/chat/chat.service.ts` (new)
- `apps/server/src/chat/chat.module.ts` (new)
