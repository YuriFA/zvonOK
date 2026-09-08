# Embeddable Whiteboard/Chat Plugins: tldraw licensing, alternatives, and architecture

> **Date:** 2026-09-08
> **Question:** can the whiteboard (and later chat) become embeddable "plugins"
> living in separate repositories behind adapters; and should the tldraw
> dependency be replaced with a custom in-house engine while keeping tldraw
> embeddable through the same seam.
> **Method:** direct reads of primary sources only: upstream LICENSE files,
> official docs and pricing pages, first-party npm registry metadata, and
> vendor developer documentation. Every load-bearing claim carries its source
> URL inline. Repo facts (tldraw ^5.4.0 lazy-loaded in
> `apps/client/src/features/whiteboard/`, Socket.io `/whiteboard` namespace
> relaying full tldraw store snapshots, NestJS in-memory relay, no board
> persistence, first-class in-repo chat module, existing React SDK /
> Prebuilt Widget embeddability of zvonok itself) are taken as given.

## 1. Executive summary

- **No, tldraw cannot be embedded for free in a commercial production app
  anymore.** The current "tldraw license" permits development use only; any
  production deployment (including a self-hosted video-call web app used by
  end users) requires a license key: trial, commercial, or hobby
  ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md),
  [License docs](https://tldraw.dev/community/license)).
- **The often-cited revenue threshold does not exist.** Neither the current
  license nor any pre-4.0 license text or pricing page we could verify from
  primary sources contains a revenue/funding cutoff. What existed before
  tldraw 4.0 was a free-with-watermark tier for everyone; it was removed by
  the license change for 4.0 (commit "License change for 4.0 (#6780)",
  Sep 17, 2025)
  ([current LICENSE](https://github.com/tldraw/tldraw/blob/main/LICENSE.md),
  [pre-4.0 LICENSE](https://raw.githubusercontent.com/tldraw/tldraw/7bf11455fa1470cb9cad37258fb65122422844e9/LICENSE.md),
  [commit](https://github.com/tldraw/tldraw/commit/e455ab838b8f30b3710b75cf340d98f2da086ac8)).
- **What removing the constraints costs today:** a 100-day free trial (one
  per company), then a commercial license with non-public "value-based
  pricing" (the last public list price, before the 4.0 change, was $6,000
  per year for individuals and teams under ten people)
  ([pricing](https://tldraw.dev/pricing),
  [license keys](https://tldraw.dev/sdk-features/license-key),
  [archived Aug 2025 pricing](https://web.archive.org/web/20250804021857/https://tldraw.dev/)).
- **The license is technically enforced client-side:** without a valid,
  domain-matched key, a production HTTPS build logs errors and stops
  rendering the editor after five seconds. Keeping the watermark on is no
  longer a compliance option for commercial production use
  ([license key docs](https://tldraw.dev/sdk-features/license-key)).
- **The current zvonok integration (tldraw ^5.4.0 in production) is
  unlicensed unless a key is configured**; on any non-localhost HTTPS
  deployment with `NODE_ENV=production` it will stop rendering
  ([license key docs](https://tldraw.dev/sdk-features/license-key)).
- **tldraw is source-available, not open source:** the whole SDK including
  the multiplayer sync engine (`@tldraw/sync`, `@tldraw/sync-core`) lives in
  the public repo but under the same restrictive license; the hosted sync
  endpoint is explicitly "suitable for prototyping" only and production
  requires self-hosting
  ([repo packages](https://github.com/tldraw/tldraw/tree/main/packages),
  [sync docs](https://tldraw.dev/docs/sync),
  [npm](https://www.npmjs.com/package/tldraw)).
- **Yes, a custom whiteboard is realistic but expensive in the long tail**:
  drawing (perfect-freehand, MIT) and hand-drawn rendering (rough.js, MIT)
  are one-file primitives, and Excalidraw is a complete MIT-licensed
  editor, but text editing, selection, undo/redo, mobile, and accessibility
  are where months disappear
  ([perfect-freehand](https://github.com/steveruizok/perfect-freehand/blob/main/LICENSE),
  [rough.js](https://github.com/pshihn/rough/blob/master/LICENSE),
  [Excalidraw](https://github.com/excalidraw/excalidraw/blob/master/LICENSE)).
- **For sync, a CRDT layer (Yjs, MIT) fits the existing NestJS/Socket.io
  stack**; Yjs is transport-agnostic and there is a community Socket.io
  connector, though the officially documented path for new transports is a
  custom provider
  ([yjs](https://github.com/yjs/yjs),
  [custom provider tutorial](https://docs.yjs.dev/tutorials/creating-a-custom-provider),
  [y-socket.io](https://github.com/ivan-topp/y-socketio)).
- **Recommended plugin architecture:** define a small `WhiteboardEngine`
  adapter interface in-repo first (engine owns its doc model; host injects a
  sync transport), keep tldraw as one implementation behind it, add
  Excalidraw as a second MIT implementation, and only then decide whether
  the engine packages leave the monorepo.
- **Separate repositories are not justified yet:** a pnpm workspace package
  can be published or extracted later without changing its public imports;
  a separate repo buys licensing/isolation at the cost of GitHub Packages
  auth, per-repo CI, and changesets discipline today
  ([pnpm workspaces](https://pnpm.io/workspaces),
  [GitHub Packages npm docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)).
- **Chat does not need this seam now**: it is an append-only message log
  with no engine lock-in; introduce the same adapter pattern when a second
  consumer actually exists.

## 2. tldraw licensing (verified from primary sources)

### 2.1 The license itself

- The npm package `tldraw` (latest 5.4.0) declares `"license": "SEE LICENSE
  IN LICENSE.md"`, and LICENSE.md is the custom **"tldraw license"** from
  tldraw, Inc: source-available, Delaware-governed, all rights reserved
  ([npm registry](https://registry.npmjs.org/tldraw),
  [LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)).
- Default permissions: use in **Development Environments** only, modify,
  bundle, and redistribute only "as part of another application", never as
  a standalone product; you may not interfere with License Key enforcement
  or remove notices ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)).
- Production use ("any production deployment ... on servers, cloud
  platforms, web applications, or where the software is used to provide
  functionality to end users, customers, or the public") requires one of:
  **trial**, **commercial**, or **hobby** license, each delivered as a
  client-validated license key
  ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md),
  [license docs](https://tldraw.dev/community/license)).
- tldraw's own docs state plainly: "While the tldraw SDK is source
  available, it is not permissively licensed ... any source code or packages
  covered by the tldraw SDK license would not be Open Source by any
  definition", and embedding tldraw in an open-source project obligates
  downstream users to obtain their own license keys for production
  ([license docs](https://tldraw.dev/community/license)).

### 2.2 What is free, and the (nonexistent) revenue threshold

| License type | Watermark | Duration | Data sent to tldraw | Source |
|---|---|---|---|---|
| None (default) | n/a | unlimited in dev only | SDK version + page URL in production | [license keys](https://tldraw.dev/sdk-features/license-key) |
| Trial | no | 100 days, one per company/project, no grace period | license ID, type, SDK version, page URL | [license keys](https://tldraw.dev/sdk-features/license-key) |
| Hobby | **yes, "made with tldraw" must stay visible** | varies; discretionary review; non-commercial projects only | license ID, type, SDK version, page URL | [hobby](https://tldraw.dev/get-a-license/hobby), [license keys](https://tldraw.dev/sdk-features/license-key) |
| Commercial | no | annual (+30-day grace); perpetual only legacy | none | [license keys](https://tldraw.dev/sdk-features/license-key) |

- **There is no revenue threshold anywhere in the current terms.** The
  question's premise ("revenue threshold under which commercial use is
  free") matches no version we could verify: the pre-4.0 license (in force
  Dec 2023 to Sep 2025) allowed commercial and non-commercial use for
  anyone as long as the watermark was not removed
  ([pre-4.0 LICENSE](https://raw.githubusercontent.com/tldraw/tldraw/7bf11455fa1470cb9cad37258fb65122422844e9/LICENSE.md)),
  and the current license has no free commercial production tier at all
  ([current LICENSE](https://github.com/tldraw/tldraw/blob/main/LICENSE.md)).
- The free-with-watermark tier was removed by the 4.0 license change on
  Sep 17, 2025
  ([commit e455ab8](https://github.com/tldraw/tldraw/commit/e455ab838b8f30b3710b75cf340d98f2da086ac8)).
  The v3.0 release notes still describe the old model ("updated licenses
  permitting use in both commercial and non-commercial projects when
  displaying a 'Made with tldraw' watermark")
  ([v3.0.0 notes](https://tldraw.dev/releases/v3.0.0)).
- Prices are no longer published: the pricing page lists "value-based
  pricing", discounted startup pricing, and a free hobby license
  ([pricing](https://tldraw.dev/pricing)). The last public figures (pre-4.0,
  archived Aug 2025): "Individuals and teams of less than ten people can
  purchase a license for $6,000 per year", larger companies custom
  ([archived tldraw.dev](https://web.archive.org/web/20250804021857/https://tldraw.dev/)).

### 2.3 Enforcement, domains, and data collection

- Keys are validated **on the client** with no license server; they are
  public and safe to ship in frontend code; each key encodes allowed hosts,
  license type, and expiry; deployment to an uncovered domain counts as
  unlicensed
  ([license keys](https://tldraw.dev/sdk-features/license-key)).
- "Production" is detected as HTTPS on a non-loopback host with
  `NODE_ENV=production`; without a key the SDK "logs errors to the console
  and, after five seconds, stops rendering the editor". Annual licenses get
  a 30-day grace period; trials expire hard. `VITE_TLDRAW_LICENSE_KEY` is
  auto-detected
  ([license keys](https://tldraw.dev/sdk-features/license-key)).
- Hobby and trial keys ping tldraw servers (license ID, type, SDK version,
  page URL); commercial keys send nothing
  ([license keys](https://tldraw.dev/sdk-features/license-key)).

### 2.4 Open vs closed: what the npm package and "SDK" actually contain

- Nothing is closed-source in the distribution sense: the editor, the
  schema, the utilities, and the multiplayer stack (`sync`,
  `sync-collaboration`, `sync-core`) all live in the public monorepo under
  the same tldraw license
  ([repo packages](https://github.com/tldraw/tldraw/tree/main/packages)).
- tldraw sync is designed to be **self-hosted**: a Cloudflare Durable
  Objects template, or `@tldraw/sync-core`'s `TLSocketRoom` in "any
  JavaScript server environment that supports WebSockets" with in-memory or
  SQLite storage; tldraw's hosted sync room is a demo "suitable for
  prototyping"
  ([sync docs](https://tldraw.dev/docs/sync)).
- The practical boundary is contractual plus a hosted demo: unrestricted
  production use (watermark removed, no telemetry) is the paid product
  ([pricing](https://tldraw.dev/pricing), which also teases closed
  "premium modules ... in development").

### 2.5 What this means for zvonok's current integration

- zvonok embeds tldraw via npm and relays full store snapshots over its own
  Socket.io namespace (repo fact). Under the current license that
  deployment is a "Production Environment" and requires a key; watermark-on
  is not a free pass because the hobby license is non-commercial and
  discretionary
  ([LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md),
  [hobby](https://tldraw.dev/get-a-license/hobby)).
- Practical options: (a) buy a commercial license (price by sales call,
  last public anchor $6k/yr), (b) run on the 100-day trial while migrating,
  or (c) move the default engine to an MIT alternative behind an adapter,
  keeping tldraw as an optional bring-your-own-license engine. Option (c)
  is the only one that removes the vendor dependency and is the basis for
  the recommendation in section 7
  ([pricing](https://tldraw.dev/pricing),
  [trial](https://tldraw.dev/get-a-license/trial)).

## 3. Embeddable engine alternatives

All licenses below were verified against each project's LICENSE file and
the npm registry. All are **MIT**.

| Engine | License (source) | Embedding in React 19 + Vite 7 (official docs) | Collaboration readiness |
|---|---|---|---|
| **Excalidraw** (`@excalidraw/excalidraw` 0.18.1) | MIT ([LICENSE](https://github.com/excalidraw/excalidraw/blob/master/LICENSE), [npm](https://registry.npmjs.org/@excalidraw%2Fexcalidraw)) | First-class: "exported as a component to be directly embedded in your project"; `npm install @excalidraw/excalidraw`; fills 100% of its container; fonts self-hostable via `window.EXCALIDRAW_ASSET_PATH` ([install docs](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation)). Peer deps allow React 17/18/**19** ([npm](https://registry.npmjs.org/@excalidraw%2Fexcalidraw)). | No sync backend in the package. The docs expose `onChange` (full scene updates) and a `LiveCollaborationTrigger` component with the explicit caveat "if **you** implement live collaboration support" ([props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props), [collab trigger](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger)). Pairs naturally with Yjs. |
| **Konva / react-konva** (10.4.0 / 19.2.6) | MIT ([konva LICENSE](https://github.com/konvajs/konva/blob/master/LICENSE), [npm](https://registry.npmjs.org/react-konva)) | react-konva maps React components to the Konva scene graph; current peer deps are `react ^19.2.0` / `react-dom ^19.2.0`, i.e. React 19 is the supported major ([repo](https://github.com/konvajs/react-konva), [npm](https://registry.npmjs.org/react-konva)). | None built in: it is a 2D canvas scene graph ("HTML5 2d canvas library for interactive graphics" per [npm](https://registry.npmjs.org/konva)); you own the document model, so it is a rendering layer for a custom engine. |
| **Fabric.js** (7.4.0) | MIT ([LICENSE](https://github.com/fabricjs/fabric.js/blob/master/LICENSE), [npm](https://registry.npmjs.org/fabric)) | Framework-agnostic canvas object model with SVG parsing; mount into any element, drive from React via refs, no React binding needed ([npm](https://registry.npmjs.org/fabric), [homepage](http://fabricjs.com/)). | None built in; JSON serialization of the object model is built in, multiplayer is DIY. |
| **PixiJS** (8.20.1) | MIT ([LICENSE](https://github.com/pixijs/pixijs/blob/dev/LICENSE), [npm](https://registry.npmjs.org/pixi.js)) | WebGL/WebGPU renderer; framework-agnostic, embed via its `Application` on a canvas element ([npm](https://registry.npmjs.org/pixi.js)). | None; GPU scene rendering, no document model, no sync. Overkill for whiteboard-shaped work. |
| **perfect-freehand** (1.2.3) | MIT ([LICENSE](https://github.com/steveruizok/perfect-freehand/blob/main/LICENSE), [npm](https://registry.npmjs.org/perfect-freehand)) | Not a component: a function producing pressure-sensitive stroke outlines from pointer input ("Draw perfect pressure-sensitive freehand strokes", [npm](https://registry.npmjs.org/perfect-freehand)). | Primitive, not an editor; combine with any renderer + your own doc model. |
| **rough.js** (4.6.6) | MIT ([LICENSE](https://github.com/pshihn/rough/blob/master/LICENSE), [npm](https://registry.npmjs.org/roughjs)) | Library that draws hand-drawn-style shapes to canvas or SVG ("Create graphics using HTML Canvas or SVG with a hand-drawn, sketchy, look", [npm](https://registry.npmjs.org/roughjs)); notably also a dependency of Excalidraw itself ([npm](https://registry.npmjs.org/@excalidraw%2Fexcalidraw)). | Primitive; rendering only. |

Read: Excalidraw is the only MIT-licensed full editor in this list;
Konva/Fabric/PixiJS are rendering layers you would still have to build an
editor on top of; perfect-freehand and rough.js are the two primitives that
make a bespoke editor tractable.

## 4. Sync/collab layer options

| Option | License | Notes |
|---|---|---|
| **Yjs** (13.6.32) | MIT ([LICENSE](https://github.com/yjs/yjs/blob/master/LICENSE), [site](https://yjs.dev/)) | CRDT shared types that "sync automatically", offline-first via IndexedDB, "does not require a central server for coordination" ([yjs.dev](https://yjs.dev/)). |
| **y-websocket** (3.1.0) | MIT ([LICENSE](https://github.com/yjs/y-websocket/blob/master/LICENSE), [npm](https://registry.npmjs.org/y-websocket)) | Official WebSocket provider + reference Node server ([npm](https://registry.npmjs.org/y-websocket)). |
| **y-protocols** (1.0.7) | MIT ([npm](https://registry.npmjs.org/y-protocols)) | The wire protocol encodings (sync/awareness) any provider implements ([npm](https://registry.npmjs.org/y-protocols)). |
| **y-indexeddb** (9.0.12) | MIT ([npm](https://registry.npmjs.org/y-indexeddb)) | Offline persistence adapter ([npm](https://registry.npmjs.org/y-indexeddb)). |
| **y-socket.io** (1.1.3) | MIT ([npm](https://registry.npmjs.org/y-socket.io), [repo](https://github.com/ivan-topp/y-socketio)) | Community "Socket IO Connector for Yjs (Inspired by y-websocket)" by an individual author ([npm](https://registry.npmjs.org/y-socket.io)). Not part of the yjs org. |
| **Automerge** (`@automerge/automerge` 3.4.1) | MIT ([repo](https://github.com/automerge/automerge)) | Rust core + WASM, "Automerge 3" released with ~10x memory reduction; two full-time maintainers from Ink & Switch ([repo README](https://github.com/automerge/automerge)). Mature, but a heavier object model than Yjs for canvas records. |
| **Liveblocks** | Commercial | Hosted collab infrastructure: Free (branding required, 3,000 collab minutes/mo), Pro $30/mo, Team from $600/mo, metered at $0.002 per collaboration minute ([pricing](https://liveblocks.io/pricing)). |
| **PartyKit** | Open-source platform | Open-source deployment platform for multiplayer/local-first apps; individual tier free (storage cleared every 24h, 10 projects), commercial tier "also free if you deploy to your own Cloudflare account"; the team joined Cloudflare in April 2024 ([homepage/pricing](https://www.partykit.io/)). |

**Yjs over the existing Socket.io server:** Yjs is network-agnostic by
design ([yjs.dev](https://yjs.dev/)), and the documented path for a custom
transport is a custom provider implementing y-protocols
([custom provider tutorial](https://docs.yjs.dev/tutorials/creating-a-custom-provider)).
`y-socket.io` exists for exactly this shape but is a community project, not
officially recommended by the yjs org ([repo](https://github.com/ivan-topp/y-socketio)).
A thin bespoke provider over the existing NestJS `/whiteboard` namespace is
low-risk and avoids depending on a third-party connector.

**CRDT ops vs the repo's full-snapshot relay.** Today one active client
publishes its **entire serialized tldraw store** (throttled) and every
receiver union-merges records by id (repo fact). What breaks as boards and
sessions grow:

- **Snapshot size grows with the board, not the edit.** A pointer drag
  re-sends every shape each time; bandwidth and JSON parse cost scale with
  cumulative content, and the throttling that keeps it bearable also makes
  the board laggy.
- **Concurrent edits are last-writer-wins per snapshot.** Union-merge by id
  silently clobbers concurrent property changes to the same shape and
  cannot express deletes vs missing records without extra tombstone logic.
- **Late joiners depend on catching a relay.** The server is a dumb
  in-memory holder with no persistence (repo fact), so a participant who
  joins between snapshots (or after a server restart) starts empty until
  the next full publish; reconnect has the same hole.
- A CRDT layer inverts all three: peers exchange small **update ops**
  (deltas), concurrent edits merge deterministically without a coordinator,
  and any peer or the server can persist a state vector plus update log to
  rehydrate late joiners ([yjs.dev](https://yjs.dev/),
  [y-protocols](https://registry.npmjs.org/y-protocols)).

## 5. Plugin architecture prior art (official developer docs only)

- **Figma plugins:** plugin code runs on the main thread inside a sandbox
  with **no browser APIs**; anything UI- or network-shaped must be created
  as an `<iframe>` via `figma.showUI()`, and the sandbox (which can touch
  the document scene) and the iframe (which can touch browser APIs) talk
  exclusively via **message passing**. A `manifest.json` declares entry
  points and network access domains ([how plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/),
  [manifest](https://developers.figma.com/docs/plugins/manifest/)).
- **VS Code extensions:** extensions are npm packages whose `package.json`
  is a manifest of **contribution points** ("a set of JSON declarations
  that you make in the `contributes` field of the package.json Extension
  Manifest", [contribution points](https://code.visualstudio.com/api/references/contribution-points))
  plus **activation events** that lazily load the extension only when its
  capability is used ([activation events](https://code.visualstudio.com/api/references/activation-events),
  [anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)).
  Extensions run in a dedicated extension host process, isolated from the
  renderer.
- **Mattermost webapp plugins:** the server ships the plugin's bundled
  JavaScript, the web app "download[s] and execute[s] the JavaScript
  bundles for each plugin", which then register through a global
  `registerPlugin` and receive a registry plus the app's Redux store.
  Note: contrary to a common description, the documented webapp plugin
  mechanism is executed bundles + registry, not iframes (plugins may of
  course embed iframes themselves) ([webapp plugins](https://developers.mattermost.com/integrate/plugins/components/webapp/)).
- **Obsidian plugins:** a `manifest.json` plus a single bundled `main.js`
  that is a CommonJS module importing the host API with
  `require('obsidian')` and must export a default class extending
  `Plugin`; all external dependencies must be bundled into `main.js`
  ([obsidian-api README](https://github.com/obsidianmd/obsidian-api)).

### Mapping to a React 19 + Vite 7 host

| Approach | Mechanism | Fit for this repo |
|---|---|---|
| (a) Compile-time npm-package plugins | A versioned package implementing a TS interface, consumed via `workspace:*` then published if needed; `workspace:` specs are rewritten to real versions on publish ([pnpm workspaces](https://pnpm.io/workspaces)) | **Best fit.** Type-safe, boring, Vite chunks it automatically via dynamic `import()` (already the pattern used for the tldraw feature). This is the Mattermost/Obsidian shape minus the runtime discovery. |
| (b) Module Federation | `@module-federation/vite` builds and consumes federated modules with shared singletons (e.g. one React); official docs support Vite with caveats: remote-module hot updates and Nuxt SSR are still on the roadmap, and build target is effectively chrome89+ ([MF Vite docs](https://module-federation.io/integrations/build-tool/vite.html)) | **Not justified.** MF solves independently-deployed remotes at fleet scale; for one host with two engines it adds a build plugin, shared-dep semantics, and type-fetching machinery for no gain over dynamic import. |
| (c) Native import maps / CDN ESM | `<script type="importmap">` maps bare specifiers to URLs before any module load ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)); baseline since Chrome 89, Firefox 108, Safari 16.4 ([browser-compat-data](https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/script.json), [caniuse](https://caniuse.com/import-maps)) | **Works but unnecessary.** Support is fine in 2026, but a Vite app already has a bundler resolver; import maps buy runtime-swappable engines, which the adapter interface already provides more safely (no cross-origin/caching/SRI story to own). |
| (d) iframe sandbox + postMessage (Figma model) | Engine runs in a sandboxed iframe; host and engine exchange messages only ([how plugins run](https://developers.figma.com/docs/plugins/how-plugins-run/)) | **Only for untrusted code.** Strong isolation, but heavy: separate document, style/scroll/keyboard bridging, and per-message serialization for a whiteboard that needs low-latency pointer traffic. Reserve for the day third parties can inject plugins into zvonok's React SDK/Prebuilt Widget. |

## 6. Separate repository vs monorepo workspace package

**Cost of a separate repo (private package):**

- Consumption: GitHub Packages serves npm packages **scoped only**
  (`@namespace/name`), requires a personal access token (classic) or
  `GITHUB_TOKEN` for auth, an `.npmrc` registry mapping in every consumer,
  and inheritable repo permissions if linked
  ([GitHub Packages npm docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)).
- Versioning: pnpm explicitly does not version workspaces for you and
  recommends **changesets** (or Rush) for multi-package release flows
  ([pnpm workspaces](https://pnpm.io/workspaces),
  [changesets](https://github.com/changesets/changesets)).
- CI/release overhead per repo: its own install/build/test pipeline,
  publish workflow, and a lockfile to keep in sync; every cross-repo
  change becomes a version bump plus release instead of one commit.

**Cost of a pnpm workspace package (`packages/*`):**

- A `pnpm-workspace.yaml` at the root plus a normal package; depend via
  `"whiteboard-engine": "workspace:*"`; on publish, `workspace:` ranges are
  replaced with the real versions so consumers outside the repo treat it
  as an ordinary package ([pnpm workspaces](https://pnpm.io/workspaces)).
- Extraction later is mechanical: move the directory to its own repo,
  publish (GitHub Packages or npm), and flip the dependency from
  `workspace:*` to a version range; **public imports do not change**.

Conclusion for this repo: keep engines as workspace packages; create a
separate repo only when a second consumer outside the monorepo exists or
when licensing isolation (e.g. a tldraw-carrying package that must not
ship to certain customers) demands it.

## 7. Implications for zvonok (recommendation)

### 7.1 The adapter seam

The wire protocol is the crux: today it carries **full serialized tldraw
store snapshots** (repo fact), so an adapter that only abstracts
mount/unmount would leak tldraw's document model through the sync layer.
The doc model and its wire format must belong to the engine; the host
injects an opaque transport.

```ts
// packages/whiteboard-engine - illustrative, not final

/** Engine-owned serialized state. Opaque to the host; never parsed here. */
export type WhiteboardSnapshot = string

/** Opaque update payload: today a full snapshot; later CRDT deltas. */
export type WhiteboardUpdate = string

/** Injected by the host. Implemented once over the existing
 *  Socket.io /whiteboard namespace. */
export interface WhiteboardTransport {
  publish(update: WhiteboardUpdate): void
  onUpdate(cb: (update: WhiteboardUpdate, from: string) => void): () => void
}

export interface MountOptions {
  boardId: string
  readonly: boolean                  // enforced by the engine UI
  initialSnapshot?: WhiteboardSnapshot
  transport: WhiteboardTransport
}

export interface WhiteboardSession {
  setReadonly(readonly: boolean): void
  /** Engine emits when its doc changed (throttled); host relays. */
  onLocalUpdate(cb: (update: WhiteboardUpdate) => void): () => void
  unmount(): void
}

/** One engine = one lazy-loaded module (tldraw, excalidraw, custom...). */
export interface WhiteboardEngine {
  readonly id: string
  mount(container: HTMLElement, opts: MountOptions): Promise<WhiteboardSession>
}
```

Why each piece exists:

- **Doc model ownership**: the engine serializes and interprets its own
  state; the NestJS relay stays a dumb byte-pipe exactly as it is today,
  so no server changes are needed to add an engine.
- **Transport injected**: the seam mirrors the current full-snapshot relay
  (an update *is* a snapshot today), and leaves room to swap in Yjs
  updates behind the same interface without touching engines that still
  snapshot.
- **Readonly enforcement**: the engine applies it in-editor (tldraw has a
  readonly mode; Excalidraw has `viewModeEnabled`), and the host double-
  checks that mounted viewers never publish.

### 7.2 Chat: later, and cheaper

Chat is an append-only log over the existing Socket.io stack with no
vendor engine and no document-model lock-in (repo facts). Introducing a
plugin seam now would be speculative generality. Apply the same pattern
(tools-injected transport, engine-owned rendering) only when a second
consumer appears, e.g. chat embedded through the React SDK/Prebuilt
Widget into third-party apps.

### 7.3 Staged path (recommended)

1. **Stage 0 (now, licensing stopgap):** decide the tldraw license question
   explicitly. Either obtain a trial/commercial key (price on request;
   last public anchor $6,000/yr, [archived pricing](https://web.archive.org/web/20250804021857/https://tldraw.dev/))
   or gate the whiteboard feature off in production deployments. Shipping
   tldraw 5.x in production without a key is a five-second render stop,
   not just a watermark ([license keys](https://tldraw.dev/sdk-features/license-key)).
2. **Stage 1 (adapter in-repo):** add the `WhiteboardEngine` interface and
   wrap the existing tldraw feature behind it, including the
   full-snapshot transport over the existing namespace. No new repo, no
   new packages, no behavior change; the seam lands where the code already
   is (`apps/client/src/features/whiteboard/`).
3. **Stage 2 (second engine):** implement the interface with Excalidraw
   (MIT) as the default engine. This immediately de-risks licensing and
   validates the seam with a real second consumer. tldraw remains
   selectable for deployments that bring their own license key.
4. **Stage 3 (packages):** promote engine implementations to
   `packages/whiteboard-engine-tldraw`, `packages/whiteboard-engine-excalidraw`
   etc. as pnpm workspace packages. Extract to separate repos only when an
   out-of-monorepo consumer or license isolation appears
   ([pnpm workspaces](https://pnpm.io/workspaces)).
5. **Stage 4 (sync upgrade, optional):** if boards need persistence,
  offline, or many concurrent editors, move the default engine to Yjs
  updates behind the same transport interface (custom provider over the
  existing namespace; community [y-socket.io](https://github.com/ivan-topp/y-socketio)
  as a reference), fixing snapshot size, concurrent-edit clobbering, and
  late joiners in one stroke.

### 7.4 Custom in-house engine: honest cost

An MVP surface list (pointer events to stroke generation via
[perfect-freehand](https://github.com/steveruizok/perfect-freehand/blob/main/LICENSE),
shape model, tool state machine, canvas render loop, snapshot sync) is
genuinely buildable in weeks. The tail is not:

- text shapes with editing and IME, multi-select with transform handles,
  z-order and grouping, undo/redo (command stack that composes with
  multiplayer), copy/paste, image/asset upload, arrow binding;
- mobile (touch/pen discrimination, palm rejection, viewport gestures
  shared with pan/zoom);
- accessibility (keyboard tool access, focus model, alternative text for
  shapes) - a canvas app gets none of this for free.

tldraw's own framing, "$5M canvas" notwithstanding, is that these are
thousands of table-stakes features ([tldraw.dev](https://tldraw.dev/)).
The recommended posture: **custom engine only if a hard product
constraint demands it; otherwise Excalidraw behind the adapter is the
MIT-licensed fast path**, with perfect-freehand/rough.js available if a
bespoke drawing feel is ever required.

## 8. Sources

tldraw licensing and sync:

- https://github.com/tldraw/tldraw/blob/main/LICENSE.md (current license)
- https://raw.githubusercontent.com/tldraw/tldraw/7bf11455fa1470cb9cad37258fb65122422844e9/LICENSE.md (pre-4.0 license, in force until Sep 2025)
- https://github.com/tldraw/tldraw/commit/e455ab838b8f30b3710b75cf340d98f2da086ac8 ("License change for 4.0")
- https://tldraw.dev/community/license
- https://tldraw.dev/sdk-features/license-key
- https://tldraw.dev/pricing
- https://tldraw.dev/get-a-license/hobby
- https://tldraw.dev/get-a-license/trial
- https://tldraw.dev/releases/v3.0.0
- https://tldraw.dev/docs/sync
- https://github.com/tldraw/tldraw/tree/main/packages
- https://web.archive.org/web/20250804021857/https://tldraw.dev/ (archived pre-4.0 pricing text)
- https://www.npmjs.com/package/tldraw and https://registry.npmjs.org/tldraw

Engines:

- https://github.com/excalidraw/excalidraw/blob/master/LICENSE
- https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation
- https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props
- https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger
- https://github.com/konvajs/konva/blob/master/LICENSE
- https://github.com/konvajs/react-konva
- https://github.com/fabricjs/fabric.js/blob/master/LICENSE
- https://github.com/pixijs/pixijs/blob/dev/LICENSE
- https://github.com/steveruizok/perfect-freehand/blob/main/LICENSE
- https://github.com/pshihn/rough/blob/master/LICENSE
- https://registry.npmjs.org/@excalidraw%2Fexcalidraw, https://registry.npmjs.org/konva, https://registry.npmjs.org/react-konva, https://registry.npmjs.org/fabric, https://registry.npmjs.org/pixi.js, https://registry.npmjs.org/perfect-freehand, https://registry.npmjs.org/roughjs (license fields, versions, peer deps, descriptions)

Sync/collab:

- https://yjs.dev/ and https://github.com/yjs/yjs
- https://github.com/yjs/yjs/blob/master/LICENSE
- https://github.com/yjs/y-websocket/blob/master/LICENSE
- https://docs.yjs.dev/tutorials/creating-a-custom-provider
- https://github.com/ivan-topp/y-socketio and https://registry.npmjs.org/y-socket.io
- https://registry.npmjs.org/y-protocols, https://registry.npmjs.org/y-indexeddb, https://registry.npmjs.org/y-websocket
- https://github.com/automerge/automerge
- https://liveblocks.io/pricing
- https://www.partykit.io/ (pricing section; Cloudflare announcement)

Plugin prior art:

- https://developers.figma.com/docs/plugins/how-plugins-run/ and https://developers.figma.com/docs/plugins/manifest/
- https://code.visualstudio.com/api/references/contribution-points, https://code.visualstudio.com/api/references/activation-events, https://code.visualstudio.com/api/get-started/extension-anatomy
- https://developers.mattermost.com/integrate/plugins/components/webapp/
- https://github.com/obsidianmd/obsidian-api

Host integration:

- https://module-federation.io/integrations/build-tool/vite.html
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/html/elements/script.json (import map support: Chrome 89, Firefox 108, Safari 16.4)
- https://caniuse.com/import-maps

Distribution:

- https://pnpm.io/workspaces
- https://github.com/changesets/changesets
- https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
