# Proposal: add-ephemeral-turn-credentials

## Why

Stage 2 queue item 3 (docs/platform-roadmap.md). TURN authentication today is a
single static username/password pair (`TURN_USER`/`TURN_PASSWORD`) baked into
env files, embedded in every deployment, and handed identically to every
client forever. Anyone who extracts it once owns the relay permanently. The
standard fix is coturn's REST auth-secret mechanism
(draft-uberti-rtcweb-turn-rest): the server mints short-lived HMAC credentials
that coturn verifies against a shared secret without storing per-user state.

## What Changes

- coturn switches from `lt-cred-mech` (static long-term credentials) to
  `use-auth-secret` + `static-auth-secret` in `turnserver.conf`
- New server env `TURN_AUTH_SECRET` (shared between the server and coturn);
  `TURN_USER`/`TURN_PASSWORD` are removed everywhere (env files, config,
  docs) - clean cutover, no fallback to static credentials
- `getIceServers()` mints ephemeral TURN credentials per call:
  username `<unix-expiry>:zvonok` with a 6h TTL, password
  `base64(HMAC-SHA1(secret, username))`; delivered through the existing
  `sfu:transport-created` payload (client untouched)
- Without `TURN_AUTH_SECRET` the TURN entry is sent URL-only (current local
  dev posture: coturn runs without auth behind localhost)
- Docs: deployment coturn section and env tables updated

## Capabilities

### Modified Capabilities

- `sfu`: the transport-lifecycle requirement now specifies ephemeral,
  signed TURN credentials instead of static ones

## Impact

- `apps/server/src/sfu/config/mediasoup.config.ts` - credential minting
- `turnserver.conf`, docs/deployment.md, server env files
- No client code changes; no database or API contract changes
