# Design: enforce-token-version-access

## Context

- `JwtStrategy` (`apps/server/src/auth/strategies/jwt.strategy.ts`) already
  injects `UserService`; `validate()` currently returns the payload without
  touching the DB, per an explicit performance comment.
- `JwtRefreshTokenStrategy.validate` is the reference pattern:
  `userService.user({ id })`, reject on missing user, reject when
  `payload.tokenVersion !== user.tokenVersion` (only when the claim is
  present), throw `UnauthorizedException`.
- Token generation already embeds `tokenVersion` in both tokens
  (`token.helper.ts`).

## Approach

Rewrite `JwtStrategy.validate` to mirror the refresh strategy:

```ts
async validate(payload: JwtPayload) {
  const user = await this.userService.user({ id: payload.id });
  if (!user) {
    throw new UnauthorizedException('Invalid access token');
  }
  if (
    payload.tokenVersion !== undefined &&
    payload.tokenVersion !== user.tokenVersion
  ) {
    throw new UnauthorizedException('Token version mismatch');
  }
  return { id: payload.id, email: payload.email, role: payload.role };
}
```

Decisions:

- **Keep the return shape** `{ id, email, role }` from the payload - guards
  and controllers depend on it; once the version is enforced, a payload role
  cannot be stale (stale tokens are rejected), so no need to leak the DB
  user further.
- **Tolerate a missing `tokenVersion` claim**, same as the refresh strategy:
  transitional grace for tokens issued before the deploy; they die within
  the 15-minute TTL regardless.
- **Accept the per-request PK lookup.** Indexed `cuid` primary key on a
  single-Postgres deployment; the stateless-JWT performance argument does
  not outweigh a 15-minute privilege-retention window at this scale.
  Rejected alternative: shortening the access TTL - shrinks the window but
  never closes it.

## Testing

`jwt.strategy.spec.ts` already covers the strategy with a mocked
`UserService`. Tests asserting the old contract ("does NOT query database",
"returns user without tokenVersion check") are inverted; new cases:

- valid payload, matching version -> returns `{ id, email, role }`
- version mismatch -> `UnauthorizedException`, no payload returned
- user not found -> `UnauthorizedException`
- payload without `tokenVersion` -> passes (transitional grace)
