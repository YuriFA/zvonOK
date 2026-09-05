# WebRTC Chat — Implementation Tasks

> Task files and implementation guides for the WebRTC chat application

---

## Directory Structure

```
tasks/
├── done/           # Completed stages (v0.1.0-alpha)
├── in-progress/    # Active work
└── backlog/        # Planned stages
```

### done/

Completed stages for the MVP release. See [done/README.md](./done/README.md) for the v0.1.0-alpha milestone summary.

### in-progress/

Active implementation work.

### backlog/

Planned stages not yet started.

**Naming conventions:**

Folders:
- Use semantic names (kebab-case): `chat`, `screen-share`, `network-quality`
- When moving to `in-progress/` or `done/`, rename to `stage-N` where N = last stage number + 1

Task files:
- Format: `{index}-{id}-{name}.md`
- `index` — sequential number within the folder (1, 2, 3...)
- `id` — task number with leading zeros (001, 002, 075...)
- `name` — short description in kebab-case
- Example: `1-075-user-roles.md`

**Renaming steps:**
1. Find max stage number in `done/` (or `in-progress/` if not empty)
2. New stage number = max + 1
3. Rename folder to `stage-N`

**Example:**
- `backlog/room-ux/` → `in-progress/stage-8/` (last was `done/stage-7/`)

---

## Task Format

Each task file includes:
- Header with status, priority, and creation date
- Description or goal
- Scope and technical design
- Step-by-step instructions
- Acceptance criteria

### Header Format

```markdown
# TASK-XXX — Title

> **Status:** planned | in-progress | completed
> **Priority:** low | medium | high
> **Created:** YYYY-MM-DD

---

## Description
...
```

**Status values:**
- `planned` — not started
- `in-progress` — actively working
- `completed` — finished

**Priority values:**
- `low` — nice to have
- `medium` — should have
- `high` — must have

---

## Task Template

```markdown
# TASK-XXX — Task Title

> **Status:** planned
> **Priority:** medium
> **Created:** YYYY-MM-DD

---

## Description

Brief description of what this task accomplishes.

## Scope

- Item 1
- Item 2
- Item 3

## Technical Design

### Section 1
Details about implementation...

### Section 2
API changes, data models, etc...

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Related Files

- `path/to/file1.ts`
- `path/to/file2.ts`
```

---

## For Developers

**Before starting a new task:**
1. Read the [SDD](../SDD.md) to understand the architecture
2. Check the [Roadmap](../roadmap.md) for high-level status
3. Follow the task file step-by-step
4. Update task status when complete

**For AI agents:**
See [Agent Guide](../agent-guide.md) for development rules and patterns.
