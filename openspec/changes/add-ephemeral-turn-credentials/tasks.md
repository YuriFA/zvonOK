# Tasks: add-ephemeral-turn-credentials

## 1. Server credential minting

- [x] 1.1 `getIceServers()`: mint ephemeral TURN credentials when
      `TURN_AUTH_SECRET` is set (username `<expiry>:zvonok`, 6h TTL, password
      `base64(HMAC-SHA1(secret, username))`); URL-only TURN entry when the
      secret is absent; remove `TURN_USER`/`TURN_PASSWORD` handling
- [x] 1.2 Unit tests: deterministic HMAC against a known vector, expiry
      window bounds, no-secret URL-only path, STUN baseline untouched;
      scoped sfu tests + tsc + lint green

## 2. coturn and deployment docs

- [x] 2.1 `turnserver.conf`: replace `lt-cred-mech` with `use-auth-secret`,
      document CLI-arg secret passing; drop static user/password wording
- [x] 2.2 Docs and env: deployment.md coturn section + env table (add
      `TURN_AUTH_SECRET`, prescribe `openssl rand -base64 32`, remove
      `TURN_USER`/`TURN_PASSWORD`), `.env.development` and `.env.example`
      cleanup, deployment cutover step
