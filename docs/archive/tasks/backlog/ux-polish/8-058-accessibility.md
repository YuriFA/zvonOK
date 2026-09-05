# TASK-058 — Accessibility (ARIA)

> **Status:** planned
> **Priority:** medium
> **Created:** 2026-02-08

---

## Description

Improve accessibility with ARIA labels, keyboard navigation, and screen reader support.

## Scope
- ARIA labels on buttons
- Keyboard navigation
- Screen reader announcements
- Focus management
- Color contrast

## Technical Design

### ARIA Implementation
```tsx
<button aria-label="Toggle microphone" aria-pressed={isMicOn}>
  <MicIcon />
</button>
```

## Acceptance Criteria
- All interactive elements labeled
- Keyboard navigation complete
- Screen reader friendly
- WCAG AA compliant

## Definition of Done
- Accessibility audit passing
- Screen readers working

## Related Files
- `apps/client/src/components/**/*.tsx`

## Next Task
All tasks complete!
