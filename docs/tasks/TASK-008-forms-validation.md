# TASK-008 — Forms + Validation (React Hook Form + Zod)

## Status
completed

## Priority
high

## Description
Set up form handling with React Hook Form and Zod validation for type-safe form validation and error handling.

## Scope
- Install React Hook Form and Zod
- Create form validation schemas
- Integrate with UI components (Input, Button, Label)
- Handle form submission
- Display validation errors

## Out of Scope
- Specific form implementations (covered in TASK-009, TASK-010, TASK-011)

## Technical Design

### Dependencies
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration
- `zod` - Schema validation

### Form Pattern
```tsx
// Schema definition
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Component
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema),
});
```

### Validation Features
- Client-side validation
- Type-safe form data
- Error messages per field
- Disabled state while submitting

## Acceptance Criteria
- Form validation works with Zod schemas
- Errors display below fields
- Form submits only when valid
- TypeScript types inferred from schema

## Definition of Done
- React Hook Form configured
- Zod schemas created for auth forms
- Validation works correctly
- Error states display properly

## Implementation Guide
See: `docs/tasks/phase-0.5-frontend-auth/0.5.4-forms-validation.md`

## Related Files
- `apps/client/src/lib/schemas.ts`
- `apps/client/src/hooks/useForm.ts`

## Next Task
TASK-009 — Auth API Client
