# TASK-010 — Login Page

## Status
completed

## Priority
high

## Description
Implement login page with form validation, API integration, and error handling for user authentication.

## Scope
- Create login form with email/password fields
- Integrate React Hook Form with Zod validation
- Connect to auth API client
- Handle loading states
- Display error messages
- Redirect on successful login

## Out of Scope
- Auth context (covered in TASK-012)
- Registration flow (covered in TASK-011)

## Technical Design

### Form Fields
- Email (required, valid email format)
- Password (required, min 8 characters)

### Validation Schema
```tsx
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

### States
- Idle - initial state
- Loading - form submitting
- Success - redirect to lobby
- Error - display error message

### Error Handling
- Network errors
- Invalid credentials
- Server errors

## Acceptance Criteria
- Login form validates input
- Submit button disabled while loading
- Error messages display correctly
- Successful login redirects to lobby
- Link to registration page

## Definition of Done
- Login page functional
- Validation works
- API integration complete
- Error handling implemented
- Navigation works after login

## Implementation Guide
See: `docs/tasks/phase-0.5-frontend-auth/0.5.6-login-page.md`

## Related Files
- `apps/client/src/routes/login.tsx`

## Next Task
TASK-011 — Register Page
