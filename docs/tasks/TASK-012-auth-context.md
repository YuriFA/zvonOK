# TASK-012 — Auth Context (State Management)

## Status
completed

## Priority
high

## Description
Create authentication context for managing user state across the application with login, logout, and token refresh functionality.

## Scope
- Create AuthContext with React Context
- Implement auth provider component
- Manage user state (logged in/out)
- Provide login/logout functions
- Handle token refresh on app load
- Protect routes that require authentication

## Out of Scope
- Lobby page (covered in TASK-013)

## Technical Design

### Auth Context Shape
```tsx
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

### Provider Logic
- Check for valid token on mount
- Refresh token if expired
- Update user state on login/logout
- Handle token refresh failures

### Route Protection
```tsx
// In protected routes
const { user, isLoading } = useAuth();
if (isLoading) return <Spinner />;
if (!user) return <Navigate to="/login" />;
```

## Acceptance Criteria
- Auth context provides user state
- Login updates user state
- Logout clears user state
- Protected routes redirect unauthenticated users
- Token refresh happens automatically

## Definition of Done
- AuthContext created
- Provider wraps app
- useAuth hook works
- Login/logout functions work
- Protected routes function correctly

## Implementation Guide
See: `docs/tasks/phase-0.5-frontend-auth/0.5.8-auth-context.md`

## Related Files
- `apps/client/src/features/auth/auth-context.tsx`
- `apps/client/src/features/auth/use-auth.ts`

## Next Task
TASK-013 — Lobby Page
