# Tasks: enforce-token-version-access

## 1. Strategy

- [x] 1.1 Rewrite `JwtStrategy.validate` per design.md: fetch user, reject on missing user and on `tokenVersion` mismatch, keep return shape
- [x] 1.2 Invert the old-contract tests in `jwt.strategy.spec.ts` and add: matching version passes, mismatch throws Unauthorized, user not found throws Unauthorized, missing claim passes

## 2. Verification

- [x] 2.1 `pnpm -C apps/server test jwt.strategy` green
- [x] 2.2 `pnpm -C apps/server test` green (no other contract depended on the DB-free path)
- [x] 2.3 `pnpm -C apps/server lint` and `pnpm -C apps/server build` green
