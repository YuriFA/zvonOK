# TASK-007 — Chat Integration in Room Page

## Status
pending

## Priority
high

## Description
Integrate chat components into the room page with WebSocket real-time messaging.

## Scope
- Add ChatPanel to RoomPage
- WebSocket event handlers for new messages
- Message history loading on room join
- Chat toggle button (show/hide)
- Responsive layout (collapsible on mobile)
- Unread message indicator

## Out of Scope
- Message list component (TASK-005)
- Message input component (TASK-006)
- WebSocket server implementation (TASK-003)

## Technical Design

### RoomPage Integration

```typescript
// RoomPage enhancement
interface RoomPageProps {
  slug: string;
}

// Chat state
interface ChatState {
  isOpen: boolean;
  messages: Message[];
  unreadCount: number;
}
```

### WebSocket Events

**Listen for:**
- `chat:message` — New message from server
- `chat:history` — Message history on join

**Emit:**
- `chat:send` — Send message to server

### UI Layout

**Desktop:**
```
┌─────────────────────────────────────┐
│  Video Grid    │    Chat Panel       │
│                │  [MessageList]      │
│                │  [MessageInput]     │
└─────────────────────────────────────┘
```

**Mobile:**
- Chat overlays video when open
- Toggle button in corner
- Close button to return to video

### Chat Toggle
- Floating button in corner
- Badge for unread count
- Smooth slide-in animation
- Persists state during session

## Acceptance Criteria
- [ ] ChatPanel integrated in RoomPage
- [ ] Toggle button to show/hide chat
- [ ] WebSocket receives new messages
- [ ] Messages auto-scroll when chat is open
- [ ] Unread badge when chat is closed
- [ ] Responsive layout (mobile/desktop)
- [ ] Message history loads on room join

## Definition of Done
- Acceptance criteria satisfied
- Real-time messaging tested
- Responsive design tested
- No video overlay issues on mobile

## Related Files
- `apps/client/src/routes/room.tsx` - RoomPage integration
- `apps/client/src/components/ChatPanel.tsx` - Chat container
- `apps/client/src/features/chat/` - Chat components

## Next Task
TASK-001 — Mediasoup Worker Setup (Stage 7)
