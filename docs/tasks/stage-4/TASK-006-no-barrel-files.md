# TASK-006 — Remove Barrel Files

## Status
completed

## Priority
medium

## Description
Remove barrel files (index.ts) from the client app to improve code maintainability and import clarity.

## Background
Barrel files (index.ts that re-export everything from a directory) are considered a bad practice because:
- **Tree-shaking issues**: Bundlers can't eliminate unused exports, leading to larger bundle sizes
- **Unclear imports**: `import { X } from '@/lib'` hides the actual file location
- **IDE performance**: Large barrel files slow down TypeScript server
- **Build performance**: Changes force rebuild of all dependent modules

## Scope
Remove all barrel files and update imports to direct paths:

### Files to Remove
1. `apps/client/src/features/room/hooks/index.ts`
2. `apps/client/src/lib/webrtc/index.ts`
3. `apps/client/src/lib/websocket/index.ts`
4. `apps/client/src/lib/media/index.ts`
5. `apps/client/src/features/media/hooks/index.ts`
6. `apps/client/src/features/media/components/index.ts`

### Import Migration Pattern
```typescript
// Before (barrel)
import { useMediaControls } from '@/features/media/hooks';

// After (direct)
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
```

````typescript
// Before (barrel)
import { WebRTCManager, webrtcManager } from '@/lib/webrtc';

// After (direct)
import { WebRTCManager, webrtcManager } from '@/lib/webrtc/manager';
```

## Out of Scope
- Server-side code (no barrel files found)
- Test files (can be updated later if needed)

## Acceptance Criteria
- [ ] All 6 barrel files removed
- [ ] All imports updated to direct paths
- [ ] Build succeeds (`pnpm build`)
- [ ] No TypeScript errors
- [ ] No runtime errors in browser

## Definition of Done
- Clean import paths throughout codebase
- Build time improved or maintained
- No regression in functionality
- Documentation updated with new rule

## Related Files
- `docs/agent-guide.md` — Add rule about barrel files
- All files with imports from the removed barrel files

## Next Task
Stage 5 — SFU (Group Calls)
