# TASK-015 — User Registration Endpoint

## Status
completed

## Priority
high

## Description
Create registration endpoint with password hashing via bcrypt, input validation via class-validator, and proper error handling.

## Scope
- Create RegisterDto with validation rules
- Implement register method in AuthService
- Hash passwords with bcrypt (cost factor 10)
- Handle duplicate email errors (409 Conflict)
- Create POST /auth/register endpoint
- Validate input with ValidationPipe
- Return user data without password

## Out of Scope
- Login functionality (covered in TASK-016)

## Technical Design

### DTO Validation
```typescript
export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### Registration Flow
1. Check if email already exists
2. Hash password with bcrypt (rounds: 10)
3. Create user in database
4. Return user without password

### Error Handling
- 400: Validation errors
- 409: Duplicate email

## Acceptance Criteria
- POST /auth/register creates user
- Password is hashed in database
- Duplicate email returns 409
- Invalid data returns 400
- Password not returned in response

## Definition of Done
- RegisterDto created
- AuthService.register() implemented
- AuthController endpoint created
- Validation works
- Password hashing verified in DB

## Implementation Guide
See: `docs/tasks/phase-01-backend/1.2-registration.md`

## Related Files
- `apps/server/src/auth/dto/register.dto.ts`
- `apps/server/src/auth/auth.service.ts`
- `apps/server/src/auth/auth.controller.ts`

## Next Task
TASK-016 — JWT Login with Refresh Tokens
