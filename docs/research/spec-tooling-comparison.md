# Spec-Tooling Research: OpenSpec vs BMAD-METHOD vs spec-kit

> **Date:** 2026-09-05
> **Question:** which spec-driven tooling replaces this repo's custom SDD
> system (decision: ADR-0001).
> **Method:** direct reads of each project's README and official docs from
> their repositories (primary sources, linked per claim). An earlier
> delegated research pass produced uncited output and was discarded.

## OpenSpec — github.com/Fission-AI/OpenSpec (chosen)

- Model: `openspec/specs/` (current behavior) + `openspec/changes/<id>/`
  (proposal.md, delta specs with `## ADDED/MODIFIED/REMOVED Requirements`,
  design.md, tasks.md); `/opsx:archive` merges the delta into specs and moves
  the change to `changes/archive/`.
  Source: [README](https://github.com/Fission-AI/OpenSpec) "See it in action".
- Philosophy: "fluid not rigid, iterative not waterfall, built for brownfield
  not just greenfield". Source: README.
- Brownfield guidance: "You do not document your whole codebase to start. You
  write specs only for what you're about to change"; existing PRDs/SRS are
  "source material for exploration, not specs to convert".
  Source: [docs/existing-projects.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md).
- Monorepo model: one `openspec/` at repo root, domains map to packages.
  Source: same doc.
- Harness integration: 40+ tool IDs incl. **`oh-my-pi`** (`.omp/skills/openspec-*/`,
  `.omp/commands/opsx/<id>.md`); the shared `.agents` target explicitly does
  **not** create or edit `AGENTS.md`.
  Source: [docs/supported-tools.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/supported-tools.md).
- Validation gate: `openspec validate --all --json` (agent-compatible).
  Source: [docs/cli.md](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md).
- Toolchain: Node >= 20.19, npm package `@fission-ai/openspec`, MIT.

## BMAD-METHOD v6 — github.com/bmad-code-org/BMAD-METHOD (rejected)

- Strength: native right-sizing — "Small changes go straight to build.
  Complex work gets the depth it needs"; delivery loop Clarify -> Plan ->
  Build -> Learn. Source: [README](https://github.com/bmad-code-org/BMAD-METHOD).
- Costs: prerequisites Node 20.12+ **and Python 3.10+ and uv**; installs its
  own agent/command ecosystem with entry points (`bmad-build`, `bmad-help`)
  that compete with AGENTS.md-as-single-entry; a module ecosystem around the
  core method. Source: README.
- Fit: closest match to gates-by-size, but the Python toolchain and
  method-owned entry points outweigh it for this solo+agents pnpm repo.

## spec-kit — github/spec-kit (rejected)

- Model: rigid per-feature pipeline `/speckit.constitution -> specify ->
  plan -> tasks -> implement -> converge` ("repeat until Converged");
  `.specify/` directory with per-feature spec/plan/tasks; extensions
  (bug, assess) and presets. Source: [README](https://github.com/github/spec-kit).
- Costs: phase gates on every feature contradict size-based gating; Python
  `uv`-based CLI (`specify`). OpenSpec's own comparison: "Thorough but
  heavyweight. Rigid phase gates, lots of Markdown, Python setup."
  (vendor claim, consistent with the README's fixed pipeline).

## Fit against this repo's constraints

| Constraint (user decisions) | OpenSpec | BMAD | spec-kit |
|---|---|---|---|
| Full cutover, distill verified truth | delta-first, grows from changes | method migration docs exist | per-feature regeneration |
| AGENTS.md single entrypoint | never edits AGENTS.md | own entry points | own slash commands |
| Gates by size | policy in AGENTS.md + `validate` gate | native | contradicts |
| Node-only toolchain | yes | Python + uv | Python (uv) |
| Harness support (oh-my-pi) | first-class `oh-my-pi` target | generic | generic |

Decision and consequences: `docs/adr/0001-migrate-sdd-to-openspec.md`.
