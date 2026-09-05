# TASK-035 — Chat UI Component

> **Status:** superseded
> **Priority:** medium
> **Created:** 2026-02-08

---

> **Note:** This task has been superseded by TASK-081, TASK-084, and TASK-087, which provide a more granular decomposition of the chat UI into `MessageList`, `MessageInput`, and `ChatPanel` (integrated in RoomPage). Implementation should follow those tasks instead.

---

## Description
Create React UI component for chat with message list, input, and auto-scroll functionality.

## Scope
- Message list with history → **TASK-081**
- Send message input → **TASK-084**
- Auto-scroll to new messages → **TASK-081**
- Message bubbles (sent/received) → **TASK-081**
- Username display → **TASK-081**
- Timestamp display → **TASK-081**
- Chat integration in RoomPage + useChat hook → **TASK-087**

## Related Files
- `apps/client/src/features/chat/components/MessageList.tsx` (TASK-081)
- `apps/client/src/features/chat/components/MessageInput.tsx` (TASK-084)
- `apps/client/src/features/chat/components/ChatPanel.tsx` (TASK-087)
