# TASK-051 — Error Boundaries

## Status
planned

## Priority
medium

## Description

Implement React error boundaries for graceful error handling and fallback UI.

## Scope
- Create error boundary component
- Wrap major route sections
- Fallback UI with retry
- Error logging

## Technical Design

### Error Boundary
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackError />;
    }
    return this.props.children;
  }
}
```

## Acceptance Criteria
- Errors caught gracefully
- Fallback UI displayed
- No white screen of death

## Definition of Done
- Error boundaries in place
- Errors logged

## Related Files
- `apps/client/src/components/error-boundary.tsx`

## Next Task
TASK-052 — Loading States
