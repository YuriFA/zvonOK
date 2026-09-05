# TASK-093 — Migrate Shadcn UI from Radix to Base UI

> **Status:** completed
> **Priority:** medium
> **Created:** 2026-03-22

---

## Description
Migrate shadcn/ui components from Radix UI primitives to Base UI primitives. This is an infrastructure upgrade that improves performance and aligns with the latest shadcn recommendations.

## Reference
- Guide: https://github.com/yluiop123/vite-shadcn (compare `radix-ui` vs `main` branches)
- Shadcn docs: https://ui.shadcn.com/

## Scope

### Components to Migrate
| Component | Radix Dep | Migration Method |
|-----------|-----------|------------------|
| Button | @radix-ui/react-slot | CLI |
| Card | none | CLI |
| Input | none | CLI |
| Label | @radix-ui/react-label | CLI |
| Tooltip | none | CLI |
| Dialog | @radix-ui/react-dialog | CLI |
| CopyLink | internal deps only | Manual |

### Dependencies
- Add: `@base-ui/react`
- Remove: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-slot`

## Technical Design

### 1. Update components.json
```json
// Before
"style": "new-york"

// After
"style": "base-vega"
```

### 2. Key API Changes
- **Remove `asChild` prop** - Base UI handles composition differently
- **Checkbox**: `checked` now strictly requires `boolean`; use `indeterminate` for partial state
- **ToggleGroup**: `value` prop requires array; use `multiple` field for selection mode
- **Form**: Prefer Base UI `Field` component over legacy `Form` system

### 3. CSS Selector Changes
Replace Radix-specific selectors:
```css
/* Before (Radix) */
data-[state=open]:animate-in
data-[state=closed]:fade-out-0

/* After (Base UI) */
data-open:animate-in
data-closed:fade-out-0
```
Base UI uses `data-open`/`data-closed` instead of `data-[state=open]`.

### 4. Positioning
Base UI uses Floating UI for popover positioning. Custom components requiring positioning should use `@floating-ui/react`.

## Step-by-Step Instructions

### Phase 1: Setup
1. [ ] Update `apps/client/components.json`: change `"style": "new-york"` to `"style": "base-vega"`
2. [ ] Install Base UI: `pnpm -C apps/client add @base-ui/react`

### Phase 2: CLI Migration (run sequentially)
3. [ ] `cd apps/client && pnpm dlx shadcn@latest add button --overwrite`
4. [ ] `pnpm dlx shadcn@latest add card --overwrite`
5. [ ] `pnpm dlx shadcn@latest add input --overwrite`
6. [ ] `pnpm dlx shadcn@latest add label --overwrite`
7. [ ] `pnpm dlx shadcn@latest add tooltip --overwrite`
8. [ ] `pnpm dlx shadcn@latest add dialog --overwrite`

### Phase 3: Manual Migration
9. [ ] Update `copy-link.tsx` - update imports if Button/Input signatures changed

### Phase 4: Cleanup
10. [ ] Search and replace CSS selectors in `src/index.css`: `data-[state=...]` → `data-...`
11. [ ] Remove `asChild` prop usage across all feature components
12. [ ] Uninstall Radix dependencies:
    ```bash
    pnpm -C apps/client remove @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot
    ```
13. [ ] Run lint: `pnpm -C apps/client lint`
14. [ ] Run tests: `pnpm -C apps/client test:run`
15. [ ] Manual regression test of all UI components

## Acceptance Criteria
- [ ] All UI components use Base UI primitives
- [ ] No `@radix-ui/*` dependencies in package.json
- [ ] No `asChild` prop in codebase
- [ ] CSS selectors updated to Base UI format
- [ ] All existing tests pass
- [ ] Visual regression: dialogs, tooltips, buttons render correctly
- [ ] Auth forms (login/register) work correctly
- [ ] Device settings panel works correctly
- [ ] Permission request modal works correctly

## Definition of Done
- Lint clean
- All tests passing
- No unused imports
- components.json updated
- Manual QA completed

## Related Files
- `apps/client/components.json`
- `apps/client/src/components/ui/button.tsx`
- `apps/client/src/components/ui/card.tsx`
- `apps/client/src/components/ui/input.tsx`
- `apps/client/src/components/ui/label.tsx`
- `apps/client/src/components/ui/tooltip.tsx`
- `apps/client/src/components/ui/dialog.tsx`
- `apps/client/src/components/ui/copy-link.tsx`
- `apps/client/src/index.css`

## Risks
- **Breaking changes**: Some components may have subtle behavior differences
- **Animation timing**: Base UI animation classes differ from Radix
- **Accessibility**: Verify ARIA attributes are preserved after migration
