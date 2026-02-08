# TASK-006 — UI Components (Radix UI)

## Status
completed

## Priority
high

## Description
Create reusable UI components based on Radix UI primitives with Tailwind CSS styling for consistent design system.

## Scope
- Button component with variants (default, destructive, outline, ghost, link)
- Button sizes (sm, default, lg, icon)
- Input component with error state support
- Card component with sub-components (Header, Title, Description, Content, Footer)
- Label component for accessibility
- Utility function for merging Tailwind classes (`cn()`)

## Out of Scope
- Form components (covered in TASK-008)
- Complex components (Dialog, Dropdown, etc.)

## Technical Design

### Dependencies
- `@radix-ui/react-slot` - For component composition
- `class-variance-authority` - For style variant management
- `clsx` + `tailwind-merge` - For conditional class merging

### Component Pattern
```typescript
// Button with CVA variants
const buttonVariants = cva(
  'base-classes',
  {
    variants: {
      variant: { default, destructive, outline, ghost, link },
      size: { sm, default, lg, icon },
    },
  }
);
```

### Button Variants
| Variant | Usage |
|---------|-------|
| default | Primary action |
| destructive | Delete, dangerous actions |
| outline | Secondary action |
| ghost | No background, icons |
| link | Link style |

## Acceptance Criteria
- Button supports all variants and sizes
- Input displays error messages
- Card components compose correctly
- Label associates with inputs
- All components use `cn()` utility
- Components are properly typed with TypeScript

## Definition of Done
- All components created in `src/components/ui/`
- Components render correctly
- Variants apply proper styles
- No TypeScript errors

## Implementation Guide
See: `docs/tasks/phase-0.5-frontend-auth/0.5.2-ui-components.md`

## Related Files
- `apps/client/src/components/ui/button.tsx`
- `apps/client/src/components/ui/input.tsx`
- `apps/client/src/components/ui/card.tsx`
- `apps/client/src/components/ui/label.tsx`
- `apps/client/src/lib/utils.ts`

## Next Task
TASK-007 — React Router v7
