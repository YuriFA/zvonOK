# Proposal: add-prebuilt-widget

## Why

Stage 2 queue item 5 (docs/platform-roadmap.md). The React package today is
headless: correct and flexible, but a consumer who wants "a working meeting
room in my app" must rebuild the entire room UI - grid, tiles, controls,
pre-join - from hooks. VideoSDK's most-copied artifact is exactly that
drop-in component. Shipping one absorbs our own UI lessons into the SDK and
gives the quickstart a 5-line integration story.

## What Changes

- New `ZvonokRoom` component in `@zvonok/react`: renders a complete meeting
  room - pre-join card (display name + device toggles, skippable), video
  grid (local + remote tiles with name and audio-off badges), controls bar
  (mic, camera, screen share, leave), participant count
- Props: `roomSlug`, `token`, `displayName?`, `onLeft?`, `onError?`,
  `skipPrejoin?`; built on the existing provider and hooks (join contract
  unchanged - token-based join surfaces typed errors)
- Self-contained styling: `zvonok.css` shipped from the package, `zvk-`
  class prefix, no Tailwind dependency; the component imports the CSS so
  bundler consumers get it automatically
- Package exports the CSS path alongside the JS entry; side-effect note
  updated accordingly
- Out of scope (non-goals): chat, host controls UI, recording button,
  keyboard shortcuts, theming API - the app keeps its own richer room UI;
  these become widget v2 candidates

## Capabilities

### Modified Capabilities

- `sdk`: the React binding requirement drops the "adds no UI components"
  clause for the package (the headless hook layer stays UI-free); a new
  prebuilt room component requirement specifies the drop-in surface

## Impact

- `packages/react/src/` - new prebuilt module (component + styles + tests)
- `packages/react/package.json` - exports map, sideEffects
- Quickstart doc gains the drop-in variant; no server changes
