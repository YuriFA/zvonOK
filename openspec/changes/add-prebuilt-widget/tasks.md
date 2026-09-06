# Tasks: add-prebuilt-widget

## 1. Component

- [x] 1.1 `src/prebuilt/`: `ZvonokRoom` (pre-join card, video grid with
      track-attachment effect, controls bar, error/leave states),
      `zvonok.css` (`zvk-` prefix), absorbed local replace-track sync
- [x] 1.2 Unit tests (jsdom): join happy path renders tiles for
      participants, typed join error state, control toggles flip capture
      state, pre-join skip, styles imported (css export present)

## 2. Ship

- [x] 2.1 Package manifest: exports `./zvonok.css`, `sideEffects` updated,
      files array includes css; headless exports untouched
- [x] 2.2 Quickstart drop-in variant (headless variant stays); roadmap item
      5 status flipped on completion
- [x] 2.3 Package suite green (`pnpm -C packages/react test:run`), tsc and
      lint clean, pack smoke still passes (dist includes css)
