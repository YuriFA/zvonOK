# Admin Panel & Observability Plan

> **Status:** Draft / Pending approval
> **Created:** 2026-05-29
> **Owner:** —
> **Related:** [deployment.md](./deployment.md), [ADR-0001 OpenSpec migration](./adr/0001-migrate-sdd-to-openspec.md), [frozen pre-OpenSpec docs](./archive/)

---

## 1. Goals

A separate admin web app plus a DevOps monitoring stack that together let an operator see:

1. **Site access analytics** — registrations, logins, failures, lockouts, active sessions, over time.
2. **Call monitoring** — active rooms/participants, call sessions, durations, peak concurrency.
3. **Call quality** — WebRTC stats per call/participant: bitrate, RTT, packet loss, jitter, resolution/FPS, quality score; aggregated trends.
4. **Logs** — searchable, structured logs from every service (server, Caddy, Postgres, coturn, SFU).
5. **Infrastructure health** — CPU, RAM, disk, network, Docker containers, Postgres, Node.js runtime.
6. **Management actions** — list/search users, change roles, view/force-end rooms, inspect a specific call.

---

## 2. Guiding Principles

1. **Ready-made first.** Use off-the-shelf tools (Grafana, Prometheus, Loki) for everything generic: infra metrics, app metrics, logs, dashboards, alerting. Only write custom code for business-specific data and actions.
2. **Two layers, clearly separated.**
   - **Layer A — Observability** (ops/SRE): Grafana + Prometheus + Loki. Generic, metrics/logs-first, real-time, alerting.
   - **Layer B — Admin app** (product/ops): a dedicated web app for business data and management actions that Grafana cannot do well (CRUD, moderation, per-call drill-down).
3. **Reuse existing auth.** The ADMIN role and JWT cookie auth already exist. Admin API + admin app ride on top of them; no separate identity system.
4. **No premature time-series DB.** Store business events/samples in the existing Postgres. Keep Prometheus for live gauges. Revisit a TSDB (Timescale/Influx) only if volume demands it.
5. **Opt-in by default in dev.** The monitoring stack is heavy; run it via a Docker Compose profile so local dev stays light.
6. **Surgical.** Instrument existing modules; do not rewrite them.

---

## 3. Target Architecture

```
                              ┌─────────────────────────────────────────────┐
                              │                 Operator                      │
                              └───────────────┬───────────┬─────────────────┘
                                              │           │
                                   Admin web app      Grafana (dashboards, logs, alerts)
                                   admin.{domain}     grafana.{domain}
                                              │           │
                      ┌───────────────────────▼───────────▼──────────────────┐
                      │                     Caddy (:443)                      │
                      │  reverse proxy + static (admin SPA + client SPA)      │
                      └───────┬──────────┬───────────┬────────────┬──────────┘
                              │          │           │            │
                          /admin/*    /socket.io  /metrics     grafana/loki/prom
                          /api*       /sfu        (scrape)     (internal)
                              │          │           │            │
                              ▼          ▼           ▼            ▼
                          ┌────────────────────────────────────────────────┐
                          │           NestJS server (:3000)                  │
                          │  • REST API (app + /admin/*)                      │
                          │  • /metrics (prom-client)                         │
                          │  • SFU gateway + metrics hooks                    │
                          │  • Auth events → DB + counters                    │
                          │  • Call quality ingestion (/metrics/call-quality)  │
                          └───────┬──────────────────────────────┬───────────┘
                                  │                               │ prom scrape
                                  ▼                               ▼
                       ┌────────────────────┐         ┌──────────────────────┐
                       │   PostgreSQL 16     │◄────────│    Prometheus         │
                       │  + business tables  │  query  │  (15s scrape)         │
                       │  (AuthEvent, Call*, │         └───────────┬──────────┘
                       │   CallQualitySample)│                     │
                       └────────────────────┘                     │ query
                                  ▲                               │
                                  │                                 ▼
                       ┌──────────┴─────────┐             ┌──────────────────┐
                       │ postgres-exporter   │             │     Grafana       │
                       └────────────────────┘             │  dashboards/      │
                                                          │  provisioning      │
                                                          └────▲─────────────┘
                                                               │
        ┌──────────────────┐    scrape      ┌──────────────────┴──────────┐
        │  node-exporter   │◄──────────────│         Loki                  │
        │  cAdvisor        │◄──────────────│   (logs via Promtail reading  │
        └──────────────────┘                │    docker container logs)    │
                                              └───────────────────────────┘

 Client (in a call) ── WebRTC stats sample ──► POST /metrics/call-quality ──► DB + Prometheus
```

---

## 4. Layer A — Observability Stack (off-the-shelf)

### 4.1 Components

| Service | Image | Purpose |
|---------|-------|---------|
| **Grafana** | `grafana/grafana-oss` | Dashboards, log exploration, alerting. Pre-provisioned datasources + dashboards. |
| **Prometheus** | `prom/prometheus` | Scrapes & stores app + infra metrics (15s). |
| **Loki** | `grafana/loki` | Stores structured logs queried from Grafana. |
| **Promtail** | `grafana/promtail` | Ships Docker container JSON logs to Loki. |
| **node-exporter** | `prom/node-exporter` | Host metrics: CPU, RAM, disk, network, filesystem. |
| **cAdvisor** | `gcr.io/cadvisor/cadvisor` | Per-container metrics: CPU, mem, net per service. |
| **postgres-exporter** | `prometheuscommunity/postgres-exporter` | Postgres metrics: connections, cache, slow queries, DB size. |

All run in a single `docker-compose.monitoring.yml`, started with `--profile monitoring`.

### 4.2 App metrics (NestJS instrumentation)

Add `prom-client`. Expose `/metrics` (scraped by Prometheus). New `MetricsModule` provides:

- **HTTP interceptor** (global NestJS middleware): `http_requests_total{method,route,status}`, `http_request_duration_seconds` histogram, `http_requests_in_progress` gauge.
- **WebSocket gauges** (from SFU gateway lifecycle): `ws_connections_total` counter, `ws_active_connections{namespace}` gauge.
- **SFU gauges** (from `SfuService`): `sfu_active_rooms`, `sfu_active_peers`, `sfu_active_producers{kind}`, `sfu_producers_total` counter, `sfu_consume_errors_total`.
- **mediasoup worker**: poll `worker.getResourceUsage()` every 10-30s → `mediasoup_worker_cpu_percent`, `mediasoup_worker_memory_mb`.
- **Auth counters** (also stored as events): `auth_events_total{type,result}` where type ∈ {register, login, refresh, logout}, result ∈ {success, failed, locked}.
- **Call quality gauges/histograms** (from ingested client samples): `call_rtt_ms`, `call_packet_loss_ratio`, `call_jitter_ms`, `call_bitrate_kbps`, `call_quality_score`, all labelled `{kind}` and optionally `{room_id}`.

> `/metrics` is **not** public. It is reached only on the internal Docker network by Prometheus. Caddy does not expose it externally.

### 4.3 Logs

- Server: keep NestJS `Logger` to stdout (already JSON-friendly via Docker json-file driver). Consider switching to structured JSON (pino) in a later pass — not required for v1.
- Promtail scrapes all container logs via the Docker socket → Loki.
- Caddy already logs JSON to stdout (good).
- Grafana "Explore → Logs" gives a unified, filterable log view across services with LogQL.

### 4.4 Grafana provisioning

Ship under `observability/grafana/provisioning/`:
- `datasources/` — Prometheus, Loki, Postgres datasources (auto-provisioned, no manual UI clicks).
- `dashboards/` — JSON dashboards:
  1. **Infra overview** — host & container CPU/RAM/disk/network (node-exporter + cAdvisor).
  2. **API health** — request rate, p50/p95/p99 latency, error rate by route, in-flight requests.
  3. **SFU / calls** — active rooms/peers/producers, worker CPU/mem, TURN usage (when available).
  4. **Call quality** — RTT, packet loss, jitter, bitrate, score distributions (histograms).
  5. **Auth & access** — registrations/logins/failures over time, lockouts.
  6. **Postgres** — connections, cache hit ratio, DB/table size, slow queries.

### 4.5 Alerting (lightweight, optional in v1)

Grafana alert rules + a notification channel (email / webhook). Starter alerts:
- API error rate (5xx) > 5% for 5 min.
- API p95 latency > 500ms for 5 min.
- mediasoup worker CPU > 90% for 2 min.
- SFU produce/consume error rate spikes.
- Postgres connection saturation.

---

## 5. Layer B — Admin Web App (custom, framework-based)

### 5.1 Location

New workspace `apps/admin` (pnpm package). React 19 + Vite, same toolchain as `apps/client`, but a separate deployable served on `admin.{domain}`.

### 5.2 Framework choice (the "ready-made" part)

**Recommendation: [Refine](https://refine.dev).**

| Option | Verdict |
|--------|---------|
| **Refine** ✅ | Headless, UI-library-agnostic (reuses our Base UI + Tailwind), data-provider pattern fits our REST API, built-in routing/auth/realtime hooks, integrates with TanStack Query (already used). **Recommended.** |
| React Admin | Mature & batteries-included, but drags in Material UI (diverges from current Tailwind/Base UI stack). |
| Metabase (only) | Excellent zero-code analytics dashboards off Postgres, but no user/room management UI. Good as a **complement**, not a replacement. |
| Custom (no framework) | Full control but re-implements tables/filters/auth/charts. Against the "ready-made" goal. |

> Refine's data provider maps onto a new `/admin/*` REST surface (list/get/update semantics). Auth provider wraps the existing JWT cookie flow and gates the app on `role === ADMIN`.

### 5.3 Screens (v1 scope)

1. **Login** — reuse existing `/auth/login`, redirect non-admins out.
2. **Overview** — KPI tiles + sparklines (active users/rooms/calls, today's logins, error rate) + link to Grafana for deep dives.
3. **Users** — list/search/paginate, role badge, change role (HOST/ADMIN), lock/unlock, view rooms & call history.
4. **Rooms & Calls** — active rooms (live participants), recent call sessions with duration/peak/quality summary; click into a call for timeline + per-participant quality.
5. **Call Quality** — trends (RTT/loss/jitter/score over time), worst-quality calls table, codec/resolution distribution.
6. **Access analytics** — login/register/failure trends, failure reasons, top IPs, locked accounts.
7. **Logs** — link/embed Grafana Explore (do not rebuild log search).
8. **System** — link to Grafana dashboards; container/service status tiles (from Prometheus `up`).

Out of scope for v1: editing room config, billing, feature flags.

---

## 6. Data Model (Prisma additions)

Add to `apps/server/prisma/schema.prisma`:

```prisma
/// Auth/account access events for analytics & audit.
model AuthEvent {
  id        BigInt    @id @default(autoincrement())
  type      AuthEventType
  result    AuthEventResult
  userId    String?
  email     String?
  ip        String?
  userAgent String?
  reason    String?   // e.g. "not_found", "locked", "bad_password"
  createdAt DateTime  @default(now()) @db.Timestamp(3)

  @@index([type, createdAt])
  @@index([userId, createdAt])
  @@index([createdAt])
}

enum AuthEventType { register login refresh logout }
enum AuthEventResult { success failed locked }

/// One record per room "call session" (from first join to empty/end).
model CallSession {
  id               String   @id @default(cuid())
  roomId           String
  room             Room     @relation(fields: [roomId], references: [id])
  hostUserId       String?
  startedAt        DateTime @default(now())
  endedAt          DateTime?
  peakParticipants Int      @default(0)
  status           CallSessionStatus @default(active)
  participants     CallParticipant[]
  qualitySamples   CallQualitySample[]

  @@index([roomId])
  @@index([status])
  @@index([startedAt])
}

enum CallSessionStatus { active ended }

model CallParticipant {
  id            String   @id @default(cuid())
  callSessionId String
  callSession   CallSession @relation(fields: [callSessionId], references: [id], onDelete: Cascade)
  userId        String?
  guestId       String?
  displayName   String?
  joinedAt      DateTime
  leftAt        DateTime?
  durationSec   Int?
  qualitySamples CallQualitySample[]

  @@index([callSessionId])
  @@index([userId])
}

/// Time-series WebRTC stats, sampled from the client (and/or server-side).
model CallQualitySample {
  id              BigInt   @id @default(autoincrement())
  callSessionId   String?
  callParticipantId String?
  userId          String?
  roomId          String?
  kind            String    // "audio" | "video"
  bitrateKbps     Float?
  rttMs           Float?
  packetLoss      Float?    // percent
  jitterMs        Float?
  fps             Int?
  width           Int?
  height          Int?
  score           Int?      // 0-100 (reuse calculateQualityScore)
  sampledAt       DateTime  @default(now()) @db.Timestamp(3)

  @@index([callSessionId, sampledAt])
  @@index([sampledAt])
  @@index([roomId, sampledAt])
}
```

**Retention:** `CallQualitySample` is high-volume. v1 keeps raw samples 7-30 days; nightly job rolls up to hourly aggregates (`CallQualityAggregate`) for long-term trends. Revisit before v1 launch.

---

## 7. Instrumentation (where data gets collected)

| Data | Source | Hook | Destination |
|------|--------|------|-------------|
| HTTP metrics | NestJS | global middleware | Prometheus (`/metrics`) |
| WS/SFU metrics | `SfuGateway` + `SfuService` | connection/disconnect, join/leave, produce/consume | Prometheus |
| Worker CPU/mem | `WorkerManager` | interval poll `getResourceUsage()` | Prometheus |
| Auth events | `AuthService` | wrap register/login/refresh/logout | Postgres `AuthEvent` + Prometheus counter |
| Call sessions | `SfuService` room lifecycle | on room created / room empty / `endRoom` | Postgres `CallSession` |
| Participants | `SfuService` join/leave | on join / disconnect | Postgres `CallParticipant` |
| Call quality | client `SfuStatsCollector` | periodic sample → `POST /metrics/call-quality` | Postgres `CallQualitySample` + Prometheus gauges |

**Client-side change (minimal):** extend `SfuStatsCollector` to also POST the computed `QualityStats` payload to the server on an interval (e.g. every 10s, batched, only when in a call). The endpoint is authenticated and attaches the current `callSessionId`/`userId` from the SFU join handshake. Server reuses the existing `calculateQualityScore` logic by sharing it (move to a shared `packages/` module or re-implement server-side).

---

## 8. Admin API surface (new, ADMIN-only)

New `AdminModule` with `@Roles(Role.ADMIN)` on every controller. Prefix `/admin`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/overview` | KPIs: counts of users/active rooms/active calls, today's logins, error rate |
| GET | `/admin/users` | Paginated users w/ filters (role, locked, search) |
| PATCH | `/admin/users/:id/role` | Change role (existing endpoint may be reused/extended) |
| POST | `/admin/users/:id/lock` / `.../unlock` | Account lock control |
| GET | `/admin/rooms/active` | Active rooms + live participant counts (reads SFU state) |
| GET | `/admin/call-sessions` | Call history (paginated, filterable by date/room/quality) |
| GET | `/admin/call-sessions/:id` | Single call: participants + quality timeline |
| GET | `/admin/call-sessions/:id/samples` | Raw quality samples for a session |
| GET | `/admin/analytics/access` | Auth event time series + breakdowns |
| GET | `/admin/analytics/quality` | Aggregated quality time series + worst calls |
| POST | `/admin/rooms/:id/end` | Force-end a room (operator action) |
| POST | `/metrics/call-quality` | **Client** ingestion (auth'd, not admin) |

All read endpoints support pagination + date-range filters. Heavy aggregations use Postgres indexes (above) and, where needed, materialized hourly aggregates.

---

## 9. Security

- **Admin API**: `JwtAuthGuard` + `@Roles(Role.ADMIN)` already exist; reuse. Non-admins get 403.
- **Admin app**: served on a distinct origin (`admin.{domain}`); its own CORS entry in `main.ts`. Login reuses `/auth/login`; on load, fetch `/auth/me` and bail out if `role !== 'ADMIN'`.
- **Grafana**: not public by default. Either
  - restrict to VPN / IP allowlist at the firewall, or
  - put behind Caddy with `basic_auth` + Caddy-issued session, or
  - enable Grafana's built-in auth + SSO later.
  Grafana must never use the app's DB credentials for arbitrary SQL beyond the read-only `postgres-exporter`/datasource role. **Create a read-only Postgres role for Grafana's Postgres datasource.**
- **`/metrics`**: internal-only (Prometheus on the Docker network); never exposed by Caddy externally. If remote scraping is needed later, add mTLS or an auth sidecar.
- **PII**: `AuthEvent.ip` / `userAgent` are sensitive — admin-only access, and excluded from logs/metrics.
- **Audit**: admin management actions (`PATCH role`, `lock`, `force-end`) write an `AuthEvent`/audit record with the acting admin id.

---

## 10. Deployment

### 10.1 Docker Compose

- Add `docker-compose.monitoring.yml` (all observability services) under a `monitoring` profile:
  `docker compose --profile monitoring up -d`.
- `make` targets: `make monitoring-up`, `make monitoring-down`, `make monitoring-logs`.
- Monitoring stack persists to named volumes (`grafana_data`, `prometheus_data`, `loki_data`).
- Resource caps: Grafana/Prometheus/Loki get soft limits so they can't starve the app on a small VPS. (On a 2-4 GB VPS this stack is heavy — note RAM requirements, see Open Questions.)

### 10.2 Caddy routing

Add to `Caddyfile` (provisional):
- `admin.{domain}` → serve `apps/admin` static build; proxy `admin.{domain}/admin/*`, `/auth/*`, `/socket.io/*` to `server:3000`.
- `grafana.{domain}` → reverse proxy `grafana:3000` (auth-protected).
- Prometheus/Loki stay internal only (no public route).

### 10.3 CI/CD

- New GHCR image `admin` (builds `apps/admin` static + Caddy serve, mirroring the client image pattern).
- Extend `.github/workflows/deploy.yml` to build/push the `admin` image and ship the monitoring compose file.

---

## 11. Phased Implementation Plan

Each phase is a task folder under `docs/tasks/` (semantic name in `backlog/`, renamed to `stage-N` when started).

### Phase 1 — Server metrics foundation
- Add `prom-client`; create `MetricsModule` + global HTTP middleware.
- Expose authenticated-optional `/metrics` (internal scrape only).
- Instrument SFU: gauges for rooms/peers/producers, worker CPU/mem poll.
- Wire WebSocket connection counters in `SfuGateway`.
- **Done =** Prometheus can scrape `/metrics`; basic API dashboard renders.

### Phase 2 — Observability stack
- `docker-compose.monitoring.yml`: Grafana, Prometheus, Loki, Promtail, node-exporter, cAdvisor, postgres-exporter.
- Grafana provisioning (datasources + 6 dashboards).
- Caddy routes for Grafana (auth-gated); Prometheus config to scrape server/exporters.
- `make monitoring-*` targets.
- **Done =** operator can open Grafana and see infra + API + SFU dashboards and explore logs.

### Phase 3 — Analytics data model & recording
- Prisma migration: `AuthEvent`, `CallSession`, `CallParticipant`, `CallQualitySample`.
- `AuthService` writes `AuthEvent` + bumps Prometheus counters.
- `SfuService` opens/closes `CallSession` + `CallParticipant` on join/leave/end.
- **Done =** real auth + call data populating Postgres.

### Phase 4 — Call quality ingestion
- Share `calculateQualityScore` (move to `packages/quality` or reimplement server-side).
- Client: `SfuStatsCollector` POSTs samples → `POST /metrics/call-quality`.
- Server stores `CallQualitySample` + updates Prometheus gauges/histograms.
- **Done =** quality dashboards populate from live calls.

### Phase 5 — Admin API
- `AdminModule` + controllers for overview, users, rooms, call-sessions, analytics, force-end.
- Paginated, filtered, ADMIN-only. Unit + e2e tests.
- **Done =** `/admin/*` endpoints usable; Postman/Swagger verified.

### Phase 6 — Admin web app
- `apps/admin` workspace (Refine + Base UI + Tailwind).
- Auth provider (JWT cookie, ADMIN gate), data provider for `/admin/*`.
- Screens: Overview, Users, Rooms & Calls, Call Quality, Access Analytics, System links.
- Dockerfile (Caddy static serve) + CI/CD image.
- **Done =** admin can log in and use all screens.

### Phase 7 — Hardening & retention
- Quality sample rollup job + retention (cron/scheduled task).
- Grafana auth + read-only Postgres role.
- Alert rules + notification channel.
- VPS sizing guidance & docs.
- Update `deployment.md`; record spec deltas via OpenSpec (`/opsx-propose` -> `/opsx-archive`).
- **Done =** production-ready, documented.

---

## 12. Open Questions / Decisions Needed

1. **VPS sizing.** Grafana + Prometheus + Loki + exporters add ~1-1.5 GB RAM. Is the current VPS big enough, or do we run monitoring on a separate host? *(Recommend: separate small host or "monitoring host" if prod VPS is 2-4 GB.)*
2. **Admin framework.** Confirm **Refine** vs React Admin vs Metabase-only. *(Recommend Refine.)*
3. **Quality sampling rate & retention.** Default 10s client samples, 7-30d raw retention. OK?
4. **Grafana exposure.** VPN/IP-allowlist vs Caddy `basic_auth` vs SSO? *(Recommend basic_auth behind Caddy for v1.)*
5. **Admin subdomain.** `admin.{domain}` confirmed, or a path (`{domain}/admin`)? *(Recommend subdomain — cleaner SPA routing + separate CORS.)*
6. **Log structure.** Switch NestJS to pino/JSON now, or keep current Logger and rely on Promtail parsing? *(Recommend pino in a later pass; v1 keeps current Logger.)*

---

## 13. OpenSpec Update Checklist (after approval)

- [ ] `/opsx-propose` the admin & observability capability (delta specs for new admin domain + observability touchpoints).
- [ ] Add `docker-compose.monitoring.yml` reference to `deployment.md`.
- [ ] Add new env vars (e.g. `GRAFANA_*`, `PROMETHEUS_RETENTION`) to env tables.
- [ ] Drive each phase as one OpenSpec change; archive merges the deltas into specs.
