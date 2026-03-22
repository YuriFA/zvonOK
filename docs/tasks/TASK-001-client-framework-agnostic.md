# TASK-001: Client Framework-Agnostic Architecture

> **Status:** Planned
> **Priority:** Medium
> **Estimate:** 5-7 days
> **Created:** 2026-03-22

---

## Goal

Refactor `apps/client/` to be more framework-agnostic and extensible by:
1. Extracting auth state to callback-based store (like Media/SFU managers)
2. Adding repository pattern for room data access
3. Extracting SFU state machine from complex hooks

## Background

Current architecture already has good separation in `lib/media/` and `lib/sfu/` with callback-based state stores. Auth state and React Query hooks are tightly coupled to React.

## Target Structure

```
lib/
├── auth/                    # NEW: Auth domain (framework-agnostic)
│   ├── interfaces.ts        # IAuthState, IAuthActions
│   ├── auth-state-store.ts  # Callback-based state store
│   └── auth-manager.ts      # Auth orchestration
│
├── room/                    # NEW: Room domain (framework-agnostic)
│   ├── interfaces.ts        # IRoomRepository, IRoomMutations
│   ├── room-repository.ts   # Repository pattern implementation
│   └── types.ts             # Room types (moved from features/room/types)
│
├── sfu/
│   ├── interfaces.ts        # (existing)
│   ├── types.ts             # (existing)
│   ├── manager.ts           # (existing)
│   ├── sfu-state-machine.ts # NEW: FSM for connection lifecycle
│   └── sfu-peer-registry.ts # NEW: Extracted from use-mediasoup
│
features/
├── auth/
│   └── contexts/
│       └── auth.context.tsx # Thin adapter to AuthStateStore
│
├── room/
│   └── hooks/
│       └── use-room.ts      # Uses IRoomRepository
│
adapters/
└── react/
    ├── room-queries.ts      # React Query adapter for repository
    └── index.ts
```

---

## Phase 1: Auth State Store

**Estimate:** 1-2 days

| Step | File | Description |
|------|------|-------------|
| 1.1 | `lib/auth/interfaces.ts` | Define `IAuthState`, `IAuthActions`, `IAuthStateStore` |
| 1.2 | `lib/auth/auth-state-store.ts` | Callback-based store (follow `MediaStateStore` pattern) |
| 1.3 | `lib/auth/auth-manager.ts` | Orchestration: login/register/logout/refresh |
| 1.4 | `features/auth/contexts/auth.context.tsx` | Thin adapter using `useSyncExternalStore` |
| 1.5 | Tests | Unit tests for AuthStateStore |

**Key Interface:**

```typescript
interface IAuthStateStore {
  getState(): AuthState;
  subscribe(callback: (state: AuthState) => void): () => void;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface IAuthActions {
  login(email: string, password: string): Promise<void>;
  register(username: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
}
```

---

## Phase 2: Repository Pattern for Room

**Estimate:** 1-2 days

| Step | File | Description |
|------|------|-------------|
| 2.1 | `lib/room/interfaces.ts` | Define `IRoomRepository`, `IRoomMutations` |
| 2.2 | `lib/room/room-repository.ts` | Implementation with `apiClient` |
| 2.3 | `adapters/react/room-queries.ts` | React Query wrapper over repository |
| 2.4 | `features/room/hooks/*.ts` | Refactor to use repository |
| 2.5 | Tests | Mock repository in unit tests |

**Key Interface:**

```typescript
interface IRoomRepository {
  findBySlug(slug: string): Promise<Room>;
  create(input: CreateRoomInput): Promise<Room>;
  update(id: string, input: UpdateRoomInput): Promise<Room>;
  delete(id: string): Promise<void>;
}
```

---

## Phase 3: SFU State Machine

**Estimate:** 2-3 days

| Step | File | Description |
|------|------|-------------|
| 3.1 | `lib/sfu/sfu-state-machine.ts` | Custom FSM for connection lifecycle |
| 3.2 | `lib/sfu/sfu-peer-registry.ts` | Extract peer tracking logic |
| 3.3 | `hooks/use-mediasoup.ts` | Thin adapter (~100 lines instead of 333) |
| 3.4 | Tests | FSM unit tests |

**FSM States:**

```
disconnected → connecting → connected → joined → producing
                   ↓            ↓          ↓
                 failed      failed     disconnected
```

**Key Interface:**

```typescript
interface ISfuStateMachine {
  state: SfuState;
  transition(event: SfuEvent): void;
  subscribe(listener: StateListener): () => void;
}

type SfuEvent = 
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'JOIN_ROOM'; payload: SfuJoinPayload }
  | { type: 'JOINED' }
  | { type: 'DISCONNECT' }
  | { type: 'ERROR'; error: Error };
```

---

## Phase 4: Documentation

**Estimate:** 0.5 days

| Step | File | Description |
|------|------|-------------|
| 4.1 | `docs/SDD.md` | Update client architecture section |
| 4.2 | `docs/modules/client-core.md` | New module documentation |

---

## Decisions

| Question | Decision |
|----------|----------|
| Backward compatibility | **Can break** - allow hook signature changes |
| State machine library | **Custom** - simple TypeScript FSM without dependencies |
| Forms scope | **Auth/room state only** - forms stay with react-hook-form + zod |

---

## Acceptance Criteria

- [ ] Auth state is framework-agnostic with callback-based store
- [ ] Room data access uses repository pattern
- [ ] SFU hook reduced from 333 to ~100 lines
- [ ] All existing tests pass
- [ ] New code has unit test coverage
- [ ] Documentation updated

---

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking existing behavior | Comprehensive test coverage before refactoring |
| Over-engineering | Keep scope limited to auth/room/sfu, don't touch forms or UI |
| Learning curve | Document patterns in module docs |

---

## References

- `lib/media/state-store.ts` - Pattern for callback-based store
- `lib/sfu/interfaces.ts` - SOLID interface pattern
- `features/media/contexts/media-manager.context.tsx` - Context as DI container
