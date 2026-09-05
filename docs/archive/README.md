# Archive — Pre-OpenSpec Documentation (frozen)

This directory holds the docs system used before the OpenSpec migration
(2026-09-05, see `docs/adr/0001-migrate-sdd-to-openspec.md`):

- `SDD.md` - the living Software Design Document (v2.5) with the REQ table
  and changelog
- `modules/` - per-module API contracts (superseded by `openspec/specs/`)
- `tasks/` - stage-numbered task files (stages 0-12; superseded by
  `openspec/changes/`)
- `roadmap.md` - development phases and status
- `agent-guide.md` - agent rules (merged into root `AGENTS.md`)

**Frozen:** these files are historical record. Do not update them. When they
disagree with `openspec/specs/`, the spec wins. New work happens in
`openspec/changes/` via `/opsx-propose` -> `/opsx-apply` -> `/opsx-archive`.
