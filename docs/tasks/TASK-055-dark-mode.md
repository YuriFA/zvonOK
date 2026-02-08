# TASK-054 — Dark Theme Support

## Status
planned

## Priority
low

## Description

Implement dark mode toggle with system preference detection.

## Scope
- Theme context
- CSS variables for theming
- Toggle button
- System preference detection
- LocalStorage persistence

## Technical Design

### Theme Variants
```css
:root {
  --bg-primary: white;
  --text-primary: black;
}

[data-theme="dark"] {
  --bg-primary: black;
  --text-primary: white;
}
```

## Acceptance Criteria
- Dark/light toggle working
- System preference respected
- Persisted across sessions

## Definition of Done
- Dark mode complete
- All components themed

## Related Files
- `apps/client/src/contexts/theme-context.tsx`

## Next Task
TASK-055 — Mobile Responsiveness
