# Agent Guide

Guidelines for AI agents working on the WebRTC Chat codebase.

## Current Focus

**Signalling Server**
**Status:** In Progress

## Active Task

**TASK-019** — Socket.io server setup in NestJS

Reference: `docs/tasks/TASK-019-socketio-server.md`

## Rules

### 1. Task-Based Development
- **Do not implement features without a task file**
- Each feature should have a corresponding task in `/docs/tasks/TASK-XXX-<slug>.md`
- Update task status when starting and finishing work
- Mark tasks as `in_progress` when starting, `completed` when done

### 2. Architecture Adherence
- **Follow architecture in [SDD](./SDD.md)**
- Read [module documentation](./modules/) before making changes
- Keep module boundaries clear
- Auth logic belongs in AuthModule, not UserModule
- UI components go in `apps/client/src/components/`

### 3. Code Style
- **Match existing patterns in the codebase**
- Use existing helper classes (PasswordHelper, TokenHelper, etc.)
- Follow NestJS conventions for server code
- Follow React 19 patterns for client code
- Use TypeScript strict mode

### 4. File Organization
```
apps/server/src/
├── auth/          # AuthModule
├── user/          # UserModule
├── gateway/       # WebSocket/Signalling
├── sfu/           # mediasoup SFU
└── prisma/        # Database service

apps/client/src/
├── routes/        # File-based routing
├── components/
│   └── ui/        # Radix UI primitives
├── contexts/      # React Context providers
└── lib/           # Utilities and config
```

### 5. API Conventions
- REST endpoints follow `/api/resource` pattern
- WebSocket events follow `namespace:action` pattern (e.g., `join:room`, `webrtc:offer`)
- Use HTTP-only cookies for JWT tokens
- Return consistent error responses

### 6. Security Requirements
- Passwords must be hashed with bcrypt
- JWT secrets must come from environment variables
- Refresh tokens must be hashed in database
- Use timing-safe comparison for token validation
- Never expose sensitive data in API responses

### 7. Testing Requirements
- Write tests for new services
- Test authentication flows
- Test error cases
- Update tests when modifying existing code

### 8. Git Conventions
- Commit messages should reference task IDs: `TASK-XXX: description`
- Make atomic commits (one logical change per commit)
- Do not mix refactoring with new features
- Update documentation when changing architecture

### 9. Documentation Updates
- Update SDD when changing architecture
- Update module docs when adding endpoints
- Create task files for new features
- Keep roadmap in sync with progress

### 10. Common Patterns

**NestJS Service Pattern:**
```typescript
@Injectable()
export class ExampleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDto) {
    return await this.prisma.example.create({ data: dto });
  }
}
```

**React Context Pattern:**
```typescript
const ExampleContext = createContext<ExampleContextValue>(null!);

export function ExampleProvider({ children }) {
  const value = useMemo(() => ({ /* ... */ }), []);
  return <ExampleContext.Provider value={value}>{children}</ExampleContext.Provider>;
}
```

**Error Handling:**
```typescript
// Server
throw new UnauthorizedException('Invalid credentials');
throw new ConflictException('Email already exists');

// Client
if (error.response?.status === 401) {
  await refreshToken();
}
```

## Quick Reference

### Important Files
- `apps/server/prisma/schema.prisma` — Database schema
- `apps/server/src/auth/auth.service.ts` — Auth business logic
- `apps/client/src/contexts/AuthContext.tsx` — Client auth state
- `CLAUDE.md` — Project-specific coding guidelines

### Common Commands
```bash
# Server
cd apps/server && pnpm start:dev    # Development with watch
cd apps/server && pnpm migrate:dev   # Apply Prisma migrations

# Client
cd apps/client && pnpm dev           # Vite dev server
cd apps/client && pnpm build         # Production build

# Database
pnpm -C apps/server bd:dev          # Start PostgreSQL via Docker
```

### Environment Variables
- Server: `apps/server/.env.development`
- Client: `apps/client/.env.local`
- Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

## Troubleshooting

### Database Connection Issues
1. Check Docker is running: `docker ps`
2. Check DATABASE_URL in `.env.development`
3. Verify PostgreSQL is accessible: `docker compose exec postgres psql -U webrtc -d webrtc_chat`

### WebSocket Connection Issues
1. Check CORS configuration in gateway
2. Verify `withCredentials: true` on client
3. Check firewall/proxy settings

### WebRTC Connection Issues
1. Verify STUN servers are accessible
2. Check browser console for ICE candidates
3. Ensure permissions for camera/microphone

## Getting Help

1. Read the relevant module documentation in `/docs/modules/`
2. Check the SDD for architecture decisions
3. Review existing similar code in the codebase
4. Refer to technology documentation (NestJS, React, Prisma, mediasoup)

---

**Last Updated:** 2026-02-08
**Current Version:** Based on SDD v1.0
