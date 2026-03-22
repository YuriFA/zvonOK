# Architecture Diagrams (C4 Model)

C4 диаграммы для WebRTC Chat. Формат — [Mermaid C4](https://mermaid.js.org/syntax/c4.html).

| Level | Scope | File |
|-------|-------|------|
| **L1 — System Context** | Кто использует систему и какие внешние системы задействованы | [c4-l1-context.md](./c4-l1-context.md) |
| **L2 — Containers** | Развёртываемые единицы: Caddy, NestJS, React SPA, PostgreSQL, coturn | [c4-l2-containers.md](./c4-l2-containers.md) |
| **L3 — Backend Components** | NestJS-модули: Auth, User, Room, SFU, Prisma | [c4-l3-backend.md](./c4-l3-backend.md) |
| **L3 — Frontend Components** | React-фичи, lib/api, lib/sfu, lib/media, routing | [c4-l3-frontend.md](./c4-l3-frontend.md) |

## Domain & High-Level Diagrams

| Diagram | Scope | File |
|---------|-------|------|
| **Domain Model** | ER-диаграмма сущностей (User, Room) | [domain-model.md](./domain-model.md) |
| **High-Level Architecture** | Клиенты ↔ Сервер ↔ БД, протоколы | [high-level.md](./high-level.md) |

## Sequence Diagrams

| Diagram | Scope | File |
|---------|-------|------|
| **SFU Media Flow** | Handshake: join → transport → produce → consume | [sequence-sfu.md](./sequence-sfu.md) |
| **Authentication Flow** | Login → token rotation → refresh | [sequence-auth.md](./sequence-auth.md) |

## Как читать диаграммы

- **L1** — самый верхний уровень: пользователи и внешние сервисы. Отвечает на вопрос «что за система и кто с ней работает».
- **L2** — разбивает систему на контейнеры (отдельные процессы/сервисы). Отвечает на вопрос «из чего состоит система и как части общаются».
- **L3** — заглядывает внутрь одного контейнера и показывает его компоненты. Отвечает на вопрос «как устроен конкретный сервис».

## Рендеринг

Диаграммы рендерятся автоматически в:
- GitHub (Markdown preview)
- VS Code с расширением Mermaid
- [mermaid.live](https://mermaid.live) — онлайн-редактор

## Что нарисовать ещё (рекомендации)

| Диаграмма | Польза |
|-----------|--------|
| **Deployment Diagram** | Карта портов, сетей Docker Compose, TURN relay range — полезно для DevOps |
| **L3 — CI/CD Pipeline** | GitHub Actions jobs и их зависимости |
