# TASK-011 — Register Page

## Status
completed

## Priority
high

## Description
Implement registration page with form validation, password confirmation, and API integration for new user accounts.

## Scope
- Create registration form with username, email, password, confirm password
- Integrate React Hook Form with Zod validation
- Connect to auth API client
- Handle loading states
- Display error messages
- Redirect on successful registration

## Out of Scope
- Auth context (covered in TASK-012)

## Technical Design

### Form Fields
- Username (required, min 3 characters)
- Email (required, valid email format)
- Password (required, min 8 characters)
- Confirm Password (required, must match password)

### Validation Schema
```tsx
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### States
- Idle - initial state
- Loading - form submitting
- Success - redirect to lobby or login
- Error - display error message

### Error Handling
- Network errors
- Validation errors
- Duplicate email/username
- Server errors

## Acceptance Criteria
- Registration form validates all fields
- Password confirmation matches
- Submit button disabled while loading
- Error messages display correctly
- Successful registration redirects appropriately
- Link to login page

## Definition of Done
- Registration page functional
- Validation works for all fields
- Password matching validated
- API integration complete
- Error handling implemented
- Navigation works after registration

## Implementation Guide
See: `docs/tasks/phase-0.5-frontend-auth/0.5.7-register-page.md`

## Related Files
- `apps/client/src/routes/register.tsx`

## Next Task
TASK-012 — Auth Context
