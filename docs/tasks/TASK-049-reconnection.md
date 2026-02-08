# TASK-049 — Automatic Reconnection

## Status
planned

## Priority
low

## Description

Implement automatic reconnection logic for WebSocket and WebRTC connections.

## Scope
- Detect disconnection
- Attempt reconnection with exponential backoff
- Restore WebRTC connections
- Notify user of reconnection status
- Max retry limits

## Technical Design

### Reconnection Logic
```typescript
const reconnect = async () => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await socket.connect();
      return;
    } catch {
      await delay(Math.pow(2, i) * 1000);
    }
  }
};
```

## Acceptance Criteria
- Automatic reconnection on disconnect
- Exponential backoff working
- User notified of status
- Max retry limit enforced

## Definition of Done
- Reconnection reliable
- User experience acceptable

## Related Files
- `apps/client/src/lib/socket.ts`
- `apps/client/src/hooks/use-reconnect.ts`

## Next Task
TASK-050 — E2E Testing with Playwright
