# TASK-033 — Real-time Chat via WebSocket

## Status
planned

## Priority
medium

## Description
Implement Socket.io events for real-time chat message delivery within rooms.

## Scope
- send_message event
- get_history event
- new_message broadcast
- Message persistence in database
- Room-based message routing

## Technical Design

### Socket Events
```typescript
// Client emits
socket.emit('send_message', { roomId, content, userId });

// Server handles
@SubscribeMessage('send_message')
async handleMessage(client, payload) {
  const message = await prisma.message.create({ data: payload });
  this.server.to(payload.roomId).emit('new_message', message);
}

// Server handles history
@SubscribeMessage('get_history')
async handleGetHistory(client, { roomId }) {
  return prisma.message.findMany({
    where: { roomId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
}
```

## Acceptance Criteria
- Messages sent via Socket.io
- Messages saved to database
- Messages broadcast to room
- History loads on join
- New messages appear in real-time

## Definition of Done
- Socket events working
- Database persistence confirmed
- Real-time delivery working
- History loading functional

## Implementation Guide

## Related Files
- `apps/server/src/webrtc/webrtc.gateway.ts`

## Next Task
TASK-035 — Chat UI Component
