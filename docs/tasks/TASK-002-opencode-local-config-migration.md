# TASK-002: Migrate Claude Local Config to OpenCode

> **Status:** Completed
> **Priority:** Medium
> **Estimate:** 0.5 day
> **Created:** 2026-03-22

---

## Goal

Move the supported project-local settings from `.claude/settings.local.json` into native OpenCode project configuration.

## Background

The repository already uses `opencode.json` for the local `shadcn` MCP server. The remaining Claude-local config contains shell permission overrides, `.env` read protection, updater disablement, and a few Claude-specific settings that do not have direct OpenCode equivalents.

## Scope

- Merge supported permission rules into `opencode.json`
- Disable OpenCode auto-updates at the project level
- Keep the existing `shadcn` MCP server enabled
- Remove the old Claude-local project config for OpenCode-only workflow
- Document Claude-only settings that cannot be migrated 1:1

## Migration Notes

### Supported mappings

- `Bash(...)` allow/deny rules -> `permission.bash`
- `Read(.env*)` deny rule -> `permission.read`
- `DISABLE_AUTOUPDATER=1` -> `autoupdate: false`

### Claude-only settings without direct OpenCode project config mapping

- Telemetry and error-reporting env toggles
- `DISABLE_COST_WARNINGS`
- `DISABLE_NON_ESSENTIAL_MODEL_CALLS`
- `DISABLE_PROMPT_CACHING`
- `ENABLE_TOOL_SEARCH`
- `includeCoAuthoredBy`
- `enableAllProjectMcpServers`
- `plansDirectory`

## Acceptance Criteria

- [x] `opencode.json` contains the migrated permission rules
- [x] `opencode.json` disables auto-update
- [x] Existing `shadcn` MCP config remains enabled
- [x] `.claude/settings.local.json` is removed from the project workflow
- [x] Unsupported Claude-only settings are documented for follow-up if needed
