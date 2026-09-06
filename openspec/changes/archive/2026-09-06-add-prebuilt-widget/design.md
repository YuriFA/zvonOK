# Design: add-prebuilt-widget

## Context

`@zvonok/react` ships ZvonokProvider + hooks (connection, participants with
remote tracks as state, device controls, host controls) and framework-free
factories; the spec pins "adds no UI components". The app's room UI
(active-room-view and friends) is the reference implementation of what a
consumer must currently rebuild by hand. The sdk join contract is
token-based with typed join errors - the widget inherits it.

## Decisions

- **D1 - Same package, dedicated module.** `ZvonokRoom` lives in
  `@zvonok/react` under `src/prebuilt/` (no second package): one version
  line, one publish, the dogfood loop stays tight. The headless entry
  remains the default export surface; the prebuilt module is an additional
  export from the same entry, with `zvonok.css` as a second export path.
- **D2 - Package-owned namespaced CSS.** A single `zvonok.css` with a
  `zvk-` class prefix, imported by the prebuilt module (side-effect CSS
  handled by the bundler) and exported as `@zvonok/react/zvonok.css` for
  manual control. No Tailwind in the package: consumers must not need a CSS
  pipeline, and the widget must not leak utilities into host apps. The
  `sideEffects` field is updated so tree-shaking keeps the CSS import.
- **D3 - Props mirror the join contract.** `roomSlug`, `token`,
  `displayName?`, `onLeft?`, `onError?`, `skipPrejoin?`. Join errors render
  as an in-widget error state (typed, from the existing error classes).
  Identity, room creation, and token minting stay the host app's job.
- **D4 - Curated feature set.** Mic/camera toggles, screen share, leave,
  participant count, pre-join device check. Chat, host-controls UI,
  recording, keyboard shortcuts are non-goals for v1: the app keeps its own
  richer room, and each of those has SDK-surface implications worth their
  own change.
- **D5 - Track attachment absorbed into the widget.** Remote
  participants/tracks arrive via the existing `useParticipants` state; the
  widget owns the `<video>` attachment effect and (ported from the app)
  the local replace-track sync on device switch. This glue moves into the
  package - the app is NOT rewired in this change; migrating the app onto
  the widget is explicitly out of scope.

## Risks / Trade-offs

- CSS imported as a side effect changes package semantics for CSS-less
  bundlers (raw node ESM consumers) - the explicit `zvonok.css` export path
  covers them; documented in the quickstart.
- The widget duplicates some visual behavior the app implements differently;
  divergence is acceptable while the app is not on the widget (deliberate,
  see D5).
- Screen share needs `getDisplayMedia` permission handling in the widget's
  own error path - small, but must render a friendly blocked state like the
  app does.

## Migration Plan

Purely additive to the package; nothing existing changes behavior except the
`sideEffects`/exports manifest fields. Quickstart gains a drop-in variant
next to the headless one.

## Open Questions

- None - scope is deliberately the VideoSDK-prebuilt-shaped core.
