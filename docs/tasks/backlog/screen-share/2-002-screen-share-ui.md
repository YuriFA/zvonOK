# TASK-002 — Screen Share UI

## Status
pending

## Priority
medium

## Description
Implement user interface for screen sharing functionality including button, status indicator, and error handling.

## Scope
- Screen share button in MediaControls component
- Visual indicator when screen share is active
- Toggle functionality (start/stop screen share)
- Error handling for user cancellation and permission denial
- Keyboard shortcut indicator (optional)

## Out of Scope
- Actual screen sharing implementation (TASK-001)
- Audio sharing with screen share
- Multiple screen sharing support

## Technical Design

### Component Structure

```typescript
// MediaControls component enhancement
interface ScreenShareButtonProps {
  isSharing: boolean;
  onToggle: () => Promise<void>;
  disabled?: boolean;
}
```

### States
1. **Idle**: Button available, not sharing
2. **Starting**: Loading state while requesting screen
3. **Sharing**: Active state with visual indicator
4. **Error**: Error message display

### User Flow
1. User clicks screen share button
2. Browser shows screen picker dialog
3. User selects screen/window/tab or cancels
4. On success: button shows active state
5. On cancel/error: show appropriate message

### Error Handling

| Error | Message | Action |
|-------|---------|--------|
| User cancelled | "Screen share cancelled" | Return to idle state |
| Permission denied | "Screen share permission denied" | Show error toast |
| Not supported | "Screen share not supported in this browser" | Hide button |

## Acceptance Criteria
- [ ] Screen share button in MediaControls
- [ ] Button shows active state (highlighted/icon change) when sharing
- [ ] Keyboard shortcut displayed (e.g., "S" for share)
- [ ] Error toast on permission denial
- [ ] Graceful handling of user cancellation
- [ ] Button hidden if `getDisplayMedia` not supported

## Definition of Done
- Acceptance criteria satisfied
- Error states tested
- Accessible button (aria-label)
- Loading state during screen selection

## Related Files
- `apps/client/src/components/MediaControls.tsx` - Add screen share button
- `apps/client/src/lib/webrtc/manager.ts` - Use WebRTCManager screen share methods
- TASK-001-screen-share.md - Core screen share implementation

## Next Task
TASK-001 — Device Enumeration (Stage 5)
