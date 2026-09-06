# Design: add-ephemeral-turn-credentials

## Context

`getIceServers()` (apps/server/src/sfu/config/mediasoup.config.ts) appends a
TURN entry from `TURN_URL` + static `TURN_USER`/`TURN_PASSWORD`, and
`SfuService` embeds the result in every transport-created payload. coturn
(repo-root `turnserver.conf`) authenticates with `lt-cred-mech` against
static credentials passed as CLI args by the prod compose file. Clients
consume whatever `username`/`credential` fields arrive - no client change
needed.

## Decisions

- **D1 - coturn REST auth-secret mechanism.** Replace `lt-cred-mech` with
  `use-auth-secret` + `static-auth-secret`. The secret lives in server env
  `TURN_AUTH_SECRET` and is passed to the coturn container as a CLI argument
  (coturn does not interpolate env in conf files - same pattern the prod
  compose already uses for user/password). One shared secret, no per-user
  state, standard draft-uberti-rtcweb-turn-rest format.
- **D2 - Credential format and TTL.** Username: `<unix-expiry>:zvonok`
  (seconds). Password: `base64(HMAC-SHA1(TURN_AUTH_SECRET, username))` -
  exactly what coturn's use-auth-secret verifies. TTL is a fixed 6 hours:
  generous enough for long meetings (an allocation, once created, survives
  the expiry), short enough that a leaked credential dies within hours.
  Fresh credentials are minted on every transport-created call, so a client
  rejoining always gets current ones.
- **D3 - Clean cutover from static credentials.** `TURN_USER` and
  `TURN_PASSWORD` are deleted from `getIceServers()`, `.env.development`,
  `.env.example`, and docs. When `TURN_AUTH_SECRET` is set but `TURN_URL`
  is absent, no TURN entry is produced (STUN-only) - same as today. When
  `TURN_URL` is set without a secret, the entry is URL-only for the open
  dev coturn.
- **D4 - Delivery channel unchanged.** Credentials still ride the
  `sfu:transport-created` payload; the browser receives them as plain
  RTCIceServer fields. No REST endpoint, no client work.
- **D5 - Zero dependencies.** `node:crypto` `createHmac('sha1')` + base64;
  the minting function is pure and unit-testable against a known vector.

## Risks / Trade-offs

- Clock skew: the expiry comes from server time; coturn compares against its
  own. Both run on the same VPS host clock (or NTP-synced containers), so a
  6h TTL makes skew a non-issue.
- HMAC-SHA1 is weak as a general hash but is exactly what coturn's REST
  mechanism specifies; the security rests on the secret's entropy (32+
  random bytes), which the docs now prescribe via `openssl rand -base64 32`.
- The VPS rollout requires updating the prod compose coturn command and
  setting `TURN_AUTH_SECRET` on both containers - documented as a deployment
  step; until then prod keeps running the old static setup from its current
  compose file.

## Migration Plan

Deploy order: set `TURN_AUTH_SECRET` on the server, update the coturn
container to `use-auth-secret` with the same secret, restart both. Old and
new auth cannot mix, so it is a single cutover window; clients reconnect and
receive ephemeral credentials on their next transport creation.

## Open Questions

- None.
