# TASK-005 — Project Setup (React + Vite + Tailwind CSS v4)

## Status
completed

## Priority
high

## Description
Create a modern React application with Vite, TypeScript, and Tailwind CSS v4 for the WebRTC video chat client.

## Scope
- Initialize Vite + React + TypeScript project
- Configure Vite dev server with API proxy
- Set up TypeScript with strict mode
- Install and configure Tailwind CSS v4 with design tokens
- Configure ESLint for code quality
- Set up HMR (Hot Module Replacement)

## Out of Scope
- UI components (covered in TASK-006)
- Routing (covered in TASK-007)
- Form libraries (covered in TASK-008)

## Technical Design

### Project Structure
```
apps/client/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    └── index.css
```

### Key Technologies
- **Vite**: Fast dev server with HMR
- **React 19**: Latest React with concurrent features
- **TypeScript**: Strict mode enabled
- **Tailwind CSS v4**: New @import syntax, CSS variables for design tokens

### Vite Configuration
- Dev server on port 5173
- Proxy `/api` requests to backend (localhost:3000)
- Source maps enabled for debugging

### Tailwind CSS v4 Setup
```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* index.css */
@import "tailwindcss";
@theme {
  --color-primary-500: #0ea5e9;
  --color-danger-500: #ef4444;
  /* ... design tokens */
}
```

## Acceptance Criteria
- Vite dev server runs on `localhost:5173`
- TypeScript compiles without errors
- Tailwind CSS classes work correctly
- HMR works for CSS and TSX changes
- ESLint runs without errors

## Definition of Done
- Project builds successfully
- Can run `pnpm dev` and see the app
- No TypeScript errors
- Tailwind styles apply correctly

## Implementation Guide

## Related Files
- `apps/client/vite.config.ts`
- `apps/client/tsconfig.json`
- `apps/client/src/index.css`
- `apps/client/src/main.tsx`

## Next Task
TASK-006 — UI Components (Radix UI)
