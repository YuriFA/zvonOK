# ADR 0001: Migrate from custom SDD docs to OpenSpec

> **Status:** accepted
> **Date:** 2026-09-05

## Context

The project grew a custom spec-driven docs system: a single living `docs/SDD.md`
(985 lines, REQ table, changelog), per-module docs in `docs/modules/`,
C4/sequence diagrams in `docs/architecture/`, `docs/roadmap.md`, and ~110
stage-numbered task files in `docs/tasks/`. It worked (12 stages shipped) but
exhibited four recurring pains: docs drifting from code, agents skipping the
process, no change-approval flow, and solo maintenance burden of a bespoke
system. Well-maintained community tools now exist (OpenSpec, BMAD-METHOD,
spec-kit).

## Decision

Adopt **OpenSpec** (`@fission-ai/openspec`, pinned as root devDependency) as
the source of truth for behavior specs (`openspec/specs/`) and change proposals
(`openspec/changes/`). Full cutover, not a hybrid:

- **Seeding:** all 7 domains (auth, user, room, chat, sfu, gateway, client)
  seeded from `docs/modules/` + the SDD REQ table, verified against code first;
  specs describe current implemented behavior only.
- **History:** `docs/SDD.md`, `docs/tasks/`, `docs/roadmap.md`,
  `docs/agent-guide.md`, `docs/modules/` moved frozen to `docs/archive/`.
- **Architecture docs stay living plain docs** in `docs/architecture/`; the
  known drift is healed at migration (domain model regenerated from
  `schema.prisma`; C4/backend/high-level patched).
- **Gates by size:** `/opsx-propose` is mandatory for new capabilities,
  breaking/architectural changes, and cross-module behavior; bug fixes and
  internal refactors go direct. Policy lives in AGENTS.md.
- **Enforcement:** `openspec validate --all` runs via lefthook pre-commit when
  `openspec/**` is staged, plus as an agent duty in AGENTS.md.
- **AGENTS.md remains the single agent entrypoint**; OpenSpec hooks in through
  generated `.omp/` skills/commands and never edits AGENTS.md.

## Alternatives considered

- **BMAD-METHOD v6** - native right-sized planning (closest to our
  gates-by-size policy), but requires Python + uv, installs its own agent
  ecosystem and entry points that compete with AGENTS.md.
- **github/spec-kit** - rigid per-feature phase gates (constitution ->
  specify -> plan -> tasks -> implement -> converge) contradict gates-by-size;
  Python/uv CLI.
- **Keep the custom system** - rejected: the four pains are structural; OpenSpec
  addresses them (delta-first specs grow from real changes; archive merges
  deltas so specs cannot silently rot; proposals add the missing approval
  checkpoint; community-maintained instead of bespoke).

## Consequences

- Specs stay accurate by construction: every archived change merges its delta
  into the affected specs.
- The stage/task workflow is replaced by change proposals; backlog items become
  candidate changes instead of task files.
- `openspec` is a repo devDependency, so validation works without global
  installs; `pnpm install` triggers `lefthook install` via the `prepare`
  script.
- Pre-OpenSpec history remains readable (frozen) in `docs/archive/` but is no
  longer authoritative; when it disagrees with `openspec/specs/`, the spec
  wins.
