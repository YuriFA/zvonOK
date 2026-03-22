# TASK-009 — Auth API Client with Token Refresh

## Status
completed

## Priority
high

## Description
Create API client for authentication endpoints with automatic token refresh logic and proper error handling.

## Scope
- Create API client with fetch
- Implement login endpoint
- Implement registration endpoint
- Implement token refresh logic
- Handle 401 responses with refresh retry
- Store tokens in HTTP-only cookies

## Out of Scope
- Actual UI forms (covered in TASK-010, TASK-011)
- Auth context state (covered in TASK-012)

## Technical Design

### API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Token Flow
1. Client receives access token (short-lived) and refresh token (long-lived)
2. Access token stored in memory
3. Refresh token stored in HTTP-only cookie
4. On 401, attempt refresh with retry

### Error Handling
- Network errors
- Validation errors (400)
- Unauthorized (401) - trigger refresh
- Server errors (500)

## Acceptance Criteria
- Can register new user
- Can login with credentials
- Access token stored correctly
- Refresh token retry works on 401
- Proper error messages displayed

## Definition of Done
- API client created
- All auth endpoints work
- Token refresh logic implemented
- Error handling complete
- TypeScript types defined

## Implementation Guide

## Related Files
- `apps/client/src/lib/api.ts`
- `apps/client/src/lib/auth.ts`

## Next Task
TASK-010 — Login Page
