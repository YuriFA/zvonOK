# TASK-042 — Adaptive Video Grid Layout

## Status
planned

## Priority
medium

## Description
Implement CSS Grid-based adaptive video layout that adjusts based on participant count.

## Scope
- Create video grid component
- CSS Grid responsive layout
- Adaptive tiles based on count
- Handle 1, 2, 4, 6, 9+ participants
- Maintain aspect ratio

## Technical Design

### Grid Variations
```css
/* 1 participant */
.grid-1 { grid-template-columns: 1fr; }

/* 2 participants */
.grid-2 { grid-template-columns: 1fr 1fr; }

/* 4 participants */
.grid-4 { grid-template-columns: repeat(2, 1fr); }

/* 6+ participants */
.grid-6 { grid-template-columns: repeat(3, 1fr); }
```

## Acceptance Criteria
- Layout adapts to participant count
- Aspect ratio maintained
- Responsive on different screens

## Definition of Done
- Grid working for all counts
- Responsive breakpoints working

## Related Files
- `apps/client/src/components/video-grid.tsx`

## Next Task
TASK-043 — Active Speaker Detection
