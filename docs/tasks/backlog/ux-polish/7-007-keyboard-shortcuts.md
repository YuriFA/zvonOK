# TASK-057 — Keyboard Shortcuts

## Status
planned

## Priority
low

## Description

Implement keyboard shortcuts for common actions.

## Scope
- Mute/unmute (M)
- Video on/off (V)
- Leave call (Esc/Q)
- Screen share (S)
- Help modal (?)

## Technical Design

### Shortcut Handlers
```typescript
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'm') toggleMic();
    if (e.key === 'v') toggleVideo();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

## Acceptance Criteria
- All shortcuts working
- No conflicts with browser
- Help modal displays shortcuts

## Definition of Done
- Shortcuts implemented
- Documentation complete

## Related Files
- `apps/client/src/hooks/use-keyboard-shortcuts.ts`

## Next Task
TASK-057 — Accessibility
