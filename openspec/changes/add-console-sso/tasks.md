## 1. Server: SSO endpoint

- [x] 1.1 Prisma: `DeveloperAccount.userId` (nullable, unique, FK cascade to User) + migration
- [x] 1.2 `DeveloperService.ssoFromAppUser(userId)`: find by link, else create with username suffixing and copied password hash; unit tests (first, repeat, collision, copied hash)
- [x] 1.3 `POST /developers/auth/sso` under the global app guard with throttle; unit test for controller wiring (401 without session)

## 2. Client: continue action

- [x] 2.1 `devApi`: send cookies on requests; `ssoLogin()` calling the endpoint
- [x] 2.2 Console login page: "Continue as <username>" for authenticated app visitors, landing in `/console` on success; test

## 3. Tests and verification

- [x] 3.1 E2E: app register + login -> SSO -> dev token works on `/developers/projects`; repeat SSO returns created=false; unauthenticated 401
- [x] 3.2 Full server + client suites and lint green; `pnpm openspec:validate`; live check in dev environment; archive
