# TASK-007 — React Router v7 with File Routing

## Status
completed

## Priority
high

## Description
Set up React Router v7 with file-system routing for SPA navigation. Create pages for lobby, login, register, and room views.

## Scope
- Install React Router v7
- Configure file-based routing in main.tsx
- Create Lobby page (/)
- Create Login page (/login)
- Create Register page (/register)
- Create Room page (/room/:room)
- Navigation guards for authenticated routes

## Out of Scope
- Form implementation (covered in TASK-008)
- Auth context (covered in TASK-012)

## Technical Design

### Routes Structure
```
src/routes/
├── lobby.tsx      # / - Main lobby with room join
├── login.tsx      # /login - Login form
├── register.tsx   # /register - Registration form
└── room.tsx       # /room/:room - Video call room
```

### React Router v7 API
- `Link` component for navigation
- `useParams` hook for route parameters
- `useNavigate` hook for programmatic navigation
- `NavLink` for active link styling

### Navigation Guards
```tsx
// Protect room route
useEffect(() => {
  if (!user) {
    navigate('/login');
  }
}, [user, navigate]);
```

## Acceptance Criteria
- All routes render correctly
- Navigation works between pages
- URL parameters accessible in Room page
- Back/forward browser buttons work
- Protected routes redirect unauthenticated users

## Definition of Done
- All 4 pages created
- Navigation works
- No broken links
- URL structure matches specification

## Implementation Guide

## Related Files
- `apps/client/src/main.tsx`
- `apps/client/src/routes/lobby.tsx`
- `apps/client/src/routes/login.tsx`
- `apps/client/src/routes/register.tsx`
- `apps/client/src/routes/room.tsx`

## Next Task
TASK-008 — Forms + Validation (React Hook Form + Zod)
