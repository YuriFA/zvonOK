# TASK-034 — Chat UI Component

## Status
planned

## Priority
medium

## Description
Create React UI component for chat with message list, input, and auto-scroll functionality.

## Scope
- Message list with history
- Send message input
- Auto-scroll to new messages
- Message bubbles (sent/received)
- Username display
- Timestamp display
- useChat hook for state management

## Technical Design

### Components
```typescript
// Chat container
<Chat roomId={roomId} userId={userId} />

// Message bubble with alignment
<div className={msg.userId === userId ? 'justify-end' : 'justify-start'}>
```

### Features
- Auto-scroll on new messages
- Distinguish sent/received messages
- Show usernames for others' messages
- Timestamps for all messages

## Acceptance Criteria
- Chat displays message history
- New messages appear in real-time
- Auto-scroll works
- Send/receive styling distinct
- Usernames and timestamps visible

## Definition of Done
- UI component functional
- Auto-scroll working
- Real-time updates working
- Styling consistent

## Implementation Guide

## Related Files
- `apps/client/src/components/chat.tsx`
- `apps/client/src/hooks/use-chat.ts`

## Next Task
TASK-035 — mediasoup Worker Setup
