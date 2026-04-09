# TASK-080 — Screen Share UI

> **Status:** done
> **Priority:** medium
> **Created:** 2026-02-09

---

## Description
Implement user interface for screen sharing functionality including button, status indicator, and error handling. Depends on `useScreenShare` hook from TASK-027.

## Scope
- Screen share button in `RoomCenterControls` component
- Visual indicator when screen share is active
- Toggle functionality (start/stop screen share)
- Error handling for user cancellation and permission denial
- Hide button if `getDisplayMedia` is not supported by the browser

## Out of Scope
- Actual screen sharing logic and SFU integration (TASK-027)
- Audio sharing with screen share
- Multiple screen sharing support

## Technical Design

### Integration Point

`RoomCenterControls` is a **pure presentational component** — it receives all state and callbacks via props. Add new props:

```typescript
// Enhancement to RoomCenterControls Props interface
interface Props {
  // ... existing props ...
  isScreenSharing: boolean;
  isScreenShareSupported: boolean;
  screenShareState: 'idle' | 'starting' | 'sharing' | 'error';
  onToggleScreenShare: () => Promise<void>;
}
```

The hook is called in `active-room-view.tsx` (the parent of `RoomCenterControls`) where other media state is already managed:

```typescript
// apps/client/src/features/room/views/active-room-view.tsx
const { startScreenShare, stopScreenShare, isSharing } = useScreenShare();

const handleToggleScreenShare = async () => {
  if (isSharing) {
    await stopScreenShare();
  } else {
    await startScreenShare();
  }
};
```

### States

| State | Description |
|-------|-------------|
| `idle` | Button available, not sharing |
| `starting` | Loading state while browser picker is open |
| `sharing` | Active state with visual indicator |
| `error` | Error message displayed briefly |

### Error Handling

| Error | Message | Action |
|-------|---------|--------|
| `NotAllowedError` (user cancelled) | "Screen share cancelled" | Return to idle silently |
| `NotAllowedError` (permission denied) | "Screen share permission denied" | Show error toast |
| `NotSupportedError` | — | Hide button entirely |

### Browser Support Check

```typescript
const isScreenShareSupported = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
```

## Acceptance Criteria
- [ ] Screen share button rendered in `RoomCenterControls`
- [ ] Button hidden if `getDisplayMedia` not supported
- [ ] Button shows loading state while screen picker dialog is open
- [ ] Button shows active state (highlighted/icon change) when sharing
- [ ] Error toast shown on permission denial
- [ ] User cancellation handled gracefully (no error shown)
- [ ] Accessible button with `aria-label`

## Definition of Done
- Acceptance criteria satisfied
- Error states tested (unit tests)
- Loading state during screen selection
- `active-room-view.tsx` updated to pass new props to `RoomCenterControls`

## Implementation Guide
1. Add `isScreenSharing`, `isScreenShareSupported`, `screenShareState`, `onToggleScreenShare` props to `RoomCenterControls` Props interface
2. Add screen share button (e.g. `Monitor` / `MonitorOff` icon from lucide-react) to the controls bar
3. In `active-room-view.tsx` call `useScreenShare()` (from TASK-027) and pass results as props
4. Detect `getDisplayMedia` support and pass `isScreenShareSupported` — hide button if `false`
5. Manage `screenShareState` local state in `active-room-view.tsx` around the `startScreenShare` call

## Related Files
- `apps/client/src/features/room/components/room-center-controls.tsx` — add screen share button and props
- `apps/client/src/features/room/views/active-room-view.tsx` — call `useScreenShare`, pass props down
- `apps/client/src/hooks/use-screen-share.ts` — core screen share hook (TASK-027)
