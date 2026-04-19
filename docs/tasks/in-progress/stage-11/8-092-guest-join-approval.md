# TASK-092 — Guest Join: подтверждение овнером + временный токен

> **Status:** in-progress
> **Priority:** high
> **Created:** 2026-04-17

---

## Description

Позволить незарегистрированным пользователям (гостям) запрашивать вход в комнату.
Овнер видит уведомление и подтверждает/отклоняет вход. После одобрения гость получает
краткосрочный JWT с ограниченным scope (`"room"`), дающий доступ только к конкретной комнате
(SFU + Chat WebSocket). Полный доступ к REST API гостю не предоставляется.

## Scope

- REST: `POST /rooms/:slug/guest-request` — создать pending-запрос
- REST: `POST /rooms/:slug/guest-approve` — овнер одобряет запрос → возвращает гостевой токен
- REST: `POST /rooms/:slug/guest-deny` — овнер отклоняет запрос
- WebSocket (SFU namespace): `sfu:guest-join-request` → уведомление овнера
- WebSocket (SFU namespace): `sfu:guest-join-approved { token }` → ответ гостю
- WebSocket (SFU namespace): `sfu:guest-join-denied` → ответ гостю
- Хранение pending-запросов в памяти (Map на сервере, TTL 5 минут)
- Гостевой JWT: payload `{ guestId, roomSlug, displayName, scope: "room" }`, TTL 2 часа
- Клиент: форма displayName на pre-join для неавторизованных; экран ожидания; диалог овнера

## Technical Design

### Серверная часть

#### Pending-запросы (in-memory)

```typescript
interface GuestJoinRequest {
  requestId: string;        // uuid
  roomSlug: string;
  displayName: string;
  ownerSocketId: string;   // socket овнера в /sfu namespace
  createdAt: number;        // Date.now() для TTL
  resolve?: (token: string | null) => void; // для long-poll или WebSocket ответа
}

// RoomModule или отдельный GuestService:
private readonly pending = new Map<string, GuestJoinRequest>();
```

TTL-очистка: `setInterval` каждые 60 секунд удаляет записи старше 5 минут.

#### POST /rooms/:slug/guest-request

- `@SkipAuthGuard()` — публичный endpoint
- Body: `{ displayName: string }` (1–50 символов)
- Сервер:
  1. Проверяет, что комната существует и `status === active`
  2. Находит сокет-соединение овнера в `/sfu` namespace (через `sfuGateway.getOwnerSocket(roomSlug)`)
  3. Создаёт pending-запрос в Map, генерирует `requestId`
  4. Эмитирует `sfu:guest-join-request { requestId, displayName }` в сокет овнера
  5. Возвращает `{ requestId }` — гость использует его для опроса
- Ошибки: 404 (комната не найдена), 400 (овнер не в комнате / displayName невалидный)

#### POST /rooms/:slug/guest-approve

- Protected (JwtAuthGuard) — только аутентифицированный овнер
- Body: `{ requestId: string }`
- Сервер:
  1. Проверяет, что `room.ownerId === req.user.id`
  2. Находит pending-запрос в Map
  3. Генерирует гостевой JWT:
     ```typescript
     jwtService.sign(
       { guestId: uuidv4(), roomSlug, displayName, scope: 'room' },
       { secret: JWT_GUEST_SECRET, expiresIn: '2h' }
     )
     ```
  4. Удаляет запрос из Map
  5. Эмитирует `sfu:guest-join-approved { token }` в сокет гостя (если гость ещё подключён) — опционально
  6. Возвращает `{ token }`
- Ошибки: 403 (не овнер), 404 (requestId не найден / истёк), 400 (запрос не для этой комнаты)

#### POST /rooms/:slug/guest-deny

- Protected (JwtAuthGuard)
- Body: `{ requestId: string }`
- Удаляет запрос из Map, эмитирует `sfu:guest-join-denied` гостю
- Возвращает 204 No Content

#### Гостевой JWT

- Отдельный env: `JWT_GUEST_SECRET` (отдельный секрет для изоляции)
- Payload:
  ```typescript
  { guestId: string, roomSlug: string, displayName: string, scope: 'room', iat, exp }
  ```
- Не сохраняется в БД, stateless
- TTL: 2 часа

#### SFU Gateway: получение сокета овнера

Добавить метод `SfuGateway.getOwnerSocketId(roomSlug: string): string | null` —
возвращает `socket.id` участника, у которого `socket.data.roomOwnerId === socket.data.userId`
для нужного roomSlug.

### Новые WebSocket события

| Событие | Направление | Payload | Описание |
|---------|------------|---------|----------|
| `sfu:guest-join-request` | Server → Owner | `{ requestId, displayName }` | Запрос входа гостя |
| `sfu:guest-join-approved` | Server → Guest | `{ token }` | Одобрен, токен готов |
| `sfu:guest-join-denied` | Server → Guest | `{}` | Отклонён |

Для уведомления гостя через WebSocket клиент должен подключаться к `/sfu` namespace
с временным `socketId` до одобрения (без JWT, только для получения ответа).
Альтернатива: гость polling-ит `GET /rooms/:slug/guest-status/:requestId`.

**Выбор: polling** (проще, без необходимости анонимного подключения к SFU):
- `GET /rooms/:slug/guest-status/:requestId` `@SkipAuthGuard()` → `{ status: 'pending' | 'approved' | 'denied', token?: string }`
- Клиент делает polling каждые 2 секунды, timeout 5 минут

### Клиентская часть

#### Pre-join (для неавторизованных)

На `RoomPage` если `useAuth()` возвращает `null`:
- Показывать форму `GuestJoinForm` с полем `displayName`
- После отправки: экран ожидания "Ожидаем одобрения овнера..."
- Polling `GET /rooms/:slug/guest-status/:requestId` каждые 2s
- При `approved`: сохранить токен (in-memory, не в cookie), перейти в звонок как гость
- При `denied`: показать сообщение "Овнер отклонил вход"

#### Pre-join (для овнера, когда гость ждёт)

- Toast или диалог: "John Doe хочет войти в комнату" с кнопками "Принять" / "Отклонить"
- Овнер видит уведомление через `sfu:guest-join-request` WebSocket событие
- При принятии: `POST /rooms/:slug/guest-approve { requestId }`
- Может быть несколько параллельных запросов (очередь)

## Acceptance Criteria

- [ ] Гость без аккаунта может отправить запрос на вход с displayName
- [ ] Овнер получает уведомление (toast/диалог) с именем гостя
- [ ] Овнер может принять → гость получает токен и входит в звонок
- [ ] Овнер может отклонить → гость видит соответствующее сообщение
- [ ] Pending-запросы очищаются через 5 минут
- [ ] Гостевой токен живёт 2 часа, содержит scope: "room" и roomSlug
- [ ] Если овнер не онлайн в комнате, запрос возвращает 400
- [ ] Только овнер может одобрить/отклонить (проверка ownerId)

## Related Files

- `apps/server/src/room/room.controller.ts`
- `apps/server/src/room/room.service.ts`
- `apps/server/src/room/room.module.ts`
- `apps/server/src/sfu/sfu.gateway.ts`
- `apps/server/src/auth/helpers/token.helper.ts`
- `apps/client/src/features/room/` — PreJoinView, RoomPage
- `apps/client/src/features/auth/` — useAuth hook
- `docs/SDD.md` — REST API table, WebSocket events table

## Environment Variables

Добавить:
- `JWT_GUEST_SECRET` — секрет для подписи гостевых токенов
