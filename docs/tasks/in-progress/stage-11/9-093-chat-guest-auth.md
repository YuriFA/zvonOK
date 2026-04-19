# TASK-093 — Chat Gateway: авторизация гостей по room-токену

> **Status:** planned
> **Priority:** high
> **Created:** 2026-04-17

---

## Description

Текущая авторизация в `ChatGateway` требует полноценный JWT пользователя (поле `id`).
Гость, получивший временный токен из TASK-092 (`scope: "room"`), не может подключиться к чату.

Задача: расширить логику `authenticate()` в `ChatGateway` для поддержки гостевого токена.
Гостевые сообщения не сохраняются в БД — только broadcast через WebSocket текущим участникам.

## Scope

- `ChatGateway.authenticate()` — поддержка двух типов токенов: пользовательский и гостевой
- `chat:send` для гостей — broadcast-only без сохранения в БД
- `chat:history` для гостей — возвращает только сохранённые сообщения (от авторизованных пользователей)
- Изоляция по комнате: гостевой токен содержит `roomSlug`, гость может слать только в эту комнату
- Никакого доступа к REST endpoints (`POST /messages`, `GET /messages/:roomId`) — только WebSocket

## Technical Design

### Типы токенов

```typescript
// Пользовательский JWT (существующий)
interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

// Гостевой JWT (новый, из TASK-092)
interface GuestTokenPayload {
  guestId: string;
  roomSlug: string;
  displayName: string;
  scope: 'room';
}
```

### ChatGateway.authenticate()

Логика определения типа токена:

```typescript
private authenticate(client: Socket): ClientIdentity | null {
  const token = this.extractToken(client);
  if (!token) return null;

  try {
    // Попытка 1: гостевой токен (отдельный секрет)
    const guest = this.jwtService.verify<GuestTokenPayload>(token, {
      secret: process.env.JWT_GUEST_SECRET,
    });
    if (guest.scope === 'room') {
      return { type: 'guest', guestId: guest.guestId, roomSlug: guest.roomSlug, displayName: guest.displayName };
    }
  } catch {
    // не гостевой — пробуем обычный
  }

  try {
    // Попытка 2: пользовательский токен
    const user = this.jwtService.verify<UserTokenPayload>(token);
    return { type: 'user', userId: user.id };
  } catch {
    return null;
  }
}

type ClientIdentity =
  | { type: 'user'; userId: string }
  | { type: 'guest'; guestId: string; roomSlug: string; displayName: string };
```

`client.data.identity` хранит `ClientIdentity`.

### chat:send (обновлённая логика)

```typescript
@SubscribeMessage('chat:send')
async handleSend(client: Socket, payload: SendMessageDto): Promise<void> {
  const identity = client.data.identity as ClientIdentity;

  if (identity.type === 'guest') {
    // Проверка: гость может писать только в свою комнату
    const room = await this.roomService.findBySlug(identity.roomSlug);
    if (!room || room.id !== payload.roomId) {
      client.emit('chat:error', { event: 'chat:send', message: 'Forbidden' });
      return;
    }
    // Broadcast без сохранения в БД
    const message = {
      id: uuidv4(),
      content: payload.content,
      roomId: payload.roomId,
      createdAt: new Date().toISOString(),
      isGuest: true,
      user: { id: identity.guestId, username: identity.displayName },
    };
    await client.join(payload.roomId);
    this.server.to(payload.roomId).emit('chat:message', message);
    return;
  }

  // Существующая логика для авторизованных пользователей
  const message = await this.chatService.sendMessage(identity.userId, payload);
  await client.join(payload.roomId);
  this.server.to(payload.roomId).emit('chat:message', message);
}
```

### chat:history

Без изменений — возвращает только записанные сообщения из БД. Гостевые сообщения не хранятся,
поэтому в истории их не будет. Гость может запросить историю (авторизованные сообщения видны всем).

Проверка доступа: если identity — гость, проверить что `roomSlug` совпадает с комнатой запроса
(нужно будет найти room по roomId и сравнить slug).

### Формат сообщения (chat:message)

Добавить опциональное поле `isGuest: boolean` в payload события, чтобы клиент мог
отображать гостевые сообщения иначе (например, без аватара или с пометкой "Гость").

```typescript
interface ChatMessagePayload {
  id: string;
  content: string;
  roomId: string;
  createdAt: string;
  isGuest?: boolean;
  user: {
    id: string;
    username: string;     // для гостей — displayName
    email?: string;       // только для авторизованных
  };
}
```

### Безопасность

- Гостевой токен верифицируется с `JWT_GUEST_SECRET` (отдельный секрет от `JWT_ACCESS_SECRET`)
- Гость не может писать в другие комнаты (проверка `roomSlug` из токена vs `roomId` из payload)
- Гость не может читать/писать REST endpoints — там остаётся `JwtAuthGuard`
- `extractToken()` остаётся без изменений — токен берётся из `auth.token` или cookie

### Модуль

`ChatModule` уже импортирует `JwtModule`. Нужно убедиться, что `JwtModule` настроен без фиксированного `secret`
(использует `secret: undefined` по умолчанию), чтобы можно было верифицировать с разными секретами через опции `verify()`.

Если `JwtModule` зарегистрирован с `secret`, нужно явно передавать секрет в `verify(token, { secret })`.

## Acceptance Criteria

- [ ] Гость с валидным room-токеном (из TASK-092) может подключиться к `/chat` namespace
- [ ] Гость без токена или с невалидным токеном — отключается (существующее поведение)
- [ ] Гостевые сообщения не сохраняются в БД
- [ ] Гостевые сообщения транслируются всем участникам комнаты через `chat:message`
- [ ] Payload `chat:message` содержит `isGuest: true` для гостевых сообщений
- [ ] Гость не может писать в другую комнату (проверка roomSlug)
- [ ] `chat:history` доступен гостям (возвращает только persistentные сообщения)
- [ ] Авторизованные пользователи не затронуты — их поведение не изменилось
- [ ] `JWT_GUEST_SECRET` вынесен в переменную окружения

## Dependencies

- TASK-092 (должен быть выполнен первым — гостевой токен должен быть реализован)

## Related Files

- `apps/server/src/chat/chat.gateway.ts`
- `apps/server/src/chat/chat.service.ts`
- `apps/server/src/chat/chat.module.ts`
- `apps/server/src/room/room.service.ts` — findBySlug (для проверки roomSlug гостя)
- `apps/client/src/features/room/` — UI чата, отображение гостевых сообщений
- `docs/SDD.md` — ChatModule описание, WebSocket events
