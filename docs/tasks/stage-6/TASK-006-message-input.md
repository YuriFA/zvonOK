# TASK-006 — Message Input Component

## Status
pending

## Priority
high

## Description
Create message input component for sending chat messages with validation and emoji support.

## Scope
- MessageInput component
- Text input with character limit
- Send button
- Enter to send, Shift+Enter for newline
- Character counter
- Empty state validation
- Loading state while sending

## Out of Scope
- Message list display (TASK-005)
- WebSocket real-time sending (TASK-003)
- File attachments (future)
- Reactions/emojis picker (future)

## Technical Design

### Component Structure

```typescript
interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  maxLength?: number;
  placeholder?: string;
}
```

### UI Layout
```
┌──────────────────────────────────┐
│ Type a message...        [Send]  │
│                           0/500  │
└──────────────────────────────────┘
```

### Behavior
1. User types message
2. Character counter updates
3. Send button disabled when empty or sending
4. Press Enter → send message
5. Press Shift+Enter → new line
6. On send → clear input, show loading
7. On success → return to empty state
8. On error → restore message, show error

### Validation Rules
- Max 500 characters
- Not empty after trim
- No whitespace-only messages

## Acceptance Criteria
- [ ] MessageInput component created
- [ ] Character counter displayed
- [ ] Send button disabled when empty
- [ ] Enter to send, Shift+Enter for newline
- [ ] Loading state during send
- [ ] Error handling with toast notification
- [ ] Focus stays in input after send
- [ ] Accessible (aria-labels)

## Definition of Done
- Acceptance criteria satisfied
- Keyboard shortcuts tested
- Error states tested

## Related Files
- `apps/client/src/features/chat/components/MessageInput.tsx` - New component
- TASK-003-chat-websocket.md - Message sending via WebSocket

## Next Task
TASK-007 — Chat Integration in Room Page
