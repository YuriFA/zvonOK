# Proposal: enforce-token-version-access

## Why

The access-token strategy skips `tokenVersion` validation (deliberate
performance choice), so after a password or role change bumps
`tokenVersion`, existing access tokens keep working for up to 15 minutes:
a demoted USER retains HOST/ADMIN powers, and after a password change an
attacker's already-issued access token survives. The refresh strategy
already enforces the check; the asymmetry is a security gap found during the
OpenSpec migration code verification.

## What Changes

- `JwtStrategy.validate` fetches the user and rejects the request when
  `tokenVersion` differs from the stored value or the user no longer exists.
- Return shape and guards are unchanged: `{ id, email, role }` from the
  payload, same `UnauthorizedException` as other auth failures.
- Cost: one extra indexed PK lookup per authenticated request. Accepted at
  this project's scale; the alternative (shorter access TTL) leaves the
  window open instead of closing it.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `auth`: "Token invalidation on credential/role change" stops carving out
  the access strategy - both strategies reject stale versions immediately.

## Impact

- Affected code: `apps/server/src/auth/strategies/jwt.strategy.ts`
  (validate), `jwt.strategy.spec.ts` (tests that asserted the old no-DB
  behavior are inverted to the new contract).
- No DB schema changes, no new endpoints, no client changes (client already
  handles 401 via refresh-and-retry).
- Transitional: access tokens issued before the deploy carry no
  `tokenVersion` claim or an old one; the strategy tolerates a missing claim
  (same convention as the refresh strategy), and pre-deploy tokens expire
  within 15 minutes anyway.
