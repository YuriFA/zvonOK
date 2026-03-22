# TASK-005 — Message List Component

## Status
pending

## Priority
high

## Description
Create message list component for displaying chat messages with auto-scroll and message grouping.

## Scope
- MessageList component
- Message bubble component (sent/received variants)
- Auto-scroll to latest message
- Message grouping by sender and time
- Timestamp display
- Read receipts (optional, future)

## Out of Scope
- Message input (TASK-006)
- WebSocket real-time updates (TASK-003)
- Message persistence API (TASK-002)

## Technical Design

### Component Structure

```typescript
interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  roomId: string;
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}
```

### Message Grouping
- Group consecutive messages from same user
- Show timestamp for first message in group
- Show avatar/username for first message in group

### UI Layout
```
┌────────────────────────────┐
│ [Avatar] John  10:30 AM    │
│ This is a message         │
│ ─────────────────────────  │
│                  10:31 AM  │
│ This is my message        │
└────────────────────────────┘
```

### Auto-Scroll Behavior
- Auto-scroll when new message arrives
- Only if user is near bottom (< 100px)
- Don't auto-scroll if user is reading history

## Acceptance Criteria
- [ ] MessageList component displays messages
- [ ] Sent messages aligned right, received aligned left
- [ ] Message grouping by sender
- [ ] Timestamps displayed
- [ ] Auto-scroll to new messages
- [ ] Loading skeleton for initial load
- [ ] "Load more" button for history

## Definition of Done
- Acceptance criteria satisfied
- Scroll behavior tested
- Responsive design

## Related Files
- `apps/client/src/features/chat/components/MessageList.tsx` - New component
- `apps/client/src/features/chat/components/MessageBubble.tsx` - Message item
- TASK-002-chat-api.md - Message data source

## Next Task
TASK-006 — Message Input Component
