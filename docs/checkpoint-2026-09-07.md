# Platform Checkpoint Review - 2026-09-07

One-page evaluation at the stage-1/stage-2 boundary, per the checkpoint in
`docs/platform-roadmap.md` ("end of month 2", reached early - the queued work
is already done).

## What was delivered (11 OpenSpec changes, 2026-09-05 to 2026-09-07)

| Change | Ships |
| --- | --- |
| `add-developer-platform` | `@zvonok/client` extraction; tenancy (accounts/projects/keys); public `/v1` API; room-token join path |
| `add-react-sdk-host-controls` | `@zvonok/react`; host controls (mute-remote, mute-all, lock); quickstart |
| `add-platform-webhooks` | Signed `room.*`/`egress.*` delivery with retries |
| `add-local-recording` | Local MediaRecorder capture |
| `add-ephemeral-turn-credentials` | HMAC REST auth for coturn, no shared secret |
| `add-docs-site` | Static docs site on the VPS |
| `add-prebuilt-widget` | Drop-in room widget over the React SDK |
| `add-hls-rtmp-egress` | Server-side program: RTMP push + HLS playback |
| `add-whiteboard` | Shared collaborative canvas |
| `record-full-call` | Recording the whole composited call, not one camera |
| `add-egress-recording` | Server-side recording to VPS disk + `/v1/recordings` API |

Scale: ~51 commits, 195 files, +17.6k LOC in `apps/`+`packages/`; three SDK
packages (`client`, `react`, `video-layout`, ~8.2k LOC). Test surface grew to
343 server tests (319 unit + 24 e2e), 166 package tests, 237 client tests.

## Checkpoint criteria, honestly scored

1. **Success bar: NOT met externally.** The bar is `npm i @zvonok/client` from
   a clean project -> token via curl -> working room on the VPS. Everything
   except the `npm i` part exists and works: the quickstart, the `/v1` API,
   the minted tokens, the live room (retested by the owner 2026-09-07 - TURN,
   produce race, and recording all verified on the real deployment). The one
   untested claim is precisely the "from outside" part: npm publish is
   deferred. Today the quickstart's `npm i @zvonok/client` would fail.
2. **Cost: 3 calendar days of solo+agents work, $0 beyond the existing VPS.**
   Well under the 1-2 month budget for stage 1, with stage 2's queue also
   consumed. The constraint that mattered was sequential one-change-at-a-time
   workflow; it kept specs in sync with code throughout.
3. **Dogfooding lessons (what building the SDK taught about the API surface):**
   - A framework-free core is extractable only if the app itself becomes its
     reference consumer; the client app now runs on the same packages.
   - Two auth paths had to coexist (cookie sessions for the app, HMAC room
     tokens minted via API key for platform consumers); identity carried
     through the `/sfu` join, not the HTTP layer.
   - Media transport forced SDK-resilience work: pinned ICE-server plumbing
     via ephemeral coturn credentials, buffering early `produce` calls around
     transport creation (found only by a real-browser test).
   - Host controls and the widget validated the layering: server signalling ->
     SDK factories -> UI, with the app and widget sharing one path.
   - Recording forced composited-layout ownership (`@zvonok/video-layout`)
     instead of per-feature canvas code.

## The decision this review feeds

- **Option A - close the loop:** publish `@zvonok/*` (requires an npm account;
  everything else is prep-ready), re-run the success bar from a clean project,
  checkpoint passes as written. Cheapest way to make the claim verifiable.
- **Option B - accept an adjusted bar:** declare the platform verified
  internally + live, leave publish parked. Portfolio story leans on the repo
  and docs site; quickstart keeps a caveat until published.
- **Option C - continue building** from the parked list (developer dashboard
  UI, meeting history over the recordings API, recording canvas polish) and
  revisit the checkpoint after.
- **Option D - stop the platform phase** here and return to app-side work.

The queued plan is exhausted either way; nothing in the repo is blocked
waiting for this decision.
