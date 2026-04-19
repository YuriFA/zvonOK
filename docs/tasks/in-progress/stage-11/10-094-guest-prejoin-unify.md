# TASK-094 — Unified Prejoin + Guest HTTP-only Cookie

> **Status:** done
> **Priority:** high
> **Created:** 2026-04-19

---

## Description

Убрать отдельную форму `GuestJoinForm` для гостей и показывать всем пользователям единый `PrejoinView`.
При нажатии "Join Room" гость без approval-токена отправляет запрос на вход, ждёт одобрения.
После одобрения сервер ставит HTTP-only cookie с гостевым JWT — при повторном заходе гость
проходит проверку cookie и заходит без повторного запроса.

## Scope

- Сервер: `GuestService.validateGuestToken()` — верификация гостевого JWT
- Сервер: `GET /rooms/:slug/guest-check` — проверка HTTP-only cookie, возвращает `{ valid, displayName? }`
- Сервер: `guestStatus` endpoint — ставить HTTP-only cookie при approved (`Set-Cookie`)
- Клиент: `roomApi.guestCheck(slug)` — вызов нового endpoint
- Клиент: расширить `PrejoinView` состояниями ожидания/отказа/ошибки для гостей
- Клиент: переписать `RoomPage` — убрать `GuestJoinForm`, объединить flow
- Удалить `guest-join-form.tsx`
- Обновить тесты

## Technical Design

### Сервер

#### GuestService.validateGuestToken()

```typescript
validateGuestToken(token: string, roomSlug: string): { guestId: string; displayName: string } | null {
  try {
    const payload = this.jwtService.verify(token, {
      secret: this.config.get<string>('JWT_GUEST_SECRET'),
    });
    if (payload.scope !== 'room' || payload.roomSlug !== roomSlug) return null;
    return { guestId: payload.guestId, displayName: payload.displayName };
  } catch {
    return null;
  }
}
```

#### GET /rooms/:slug/guest-check

- `@SkipAuthGuard()`
- Читает cookie `zvonok_guest_{slug}` из `req.cookies`
- Валидирует через `GuestService.validateGuestToken()`
- Response: `{ valid: boolean, displayName?: string }`

#### Модификация guestStatus (Set-Cookie)

При `status === "approved"`:
- Установить HTTP-only cookie через `@Res({ passthrough: true })`:
  - Name: `zvonok_guest_{slug}`
  - Value: guest JWT token
  - `httpOnly: true`
  - `sameSite: 'lax'`
  - `maxAge: 7200` (2ч, = TTL JWT)
  - `path: /`
- Тело ответа: `{ status: "approved" }` (убрать `token` — он теперь в cookie)

#### Cookie parsing

`cookie-parser` уже подключён в `configureApp()` (`apps/server/src/bootstrap.ts`).
`RoomController` использует `@Req() req: Request` для чтения cookies и
`@Res({ passthrough: true }) res: Response` для установки Set-Cookie.

### Клиент

#### roomApi.guestCheck(slug)

```typescript
async guestCheck(slug: string): Promise<{ valid: boolean; displayName?: string }> {
  return this.client.get(`/rooms/${slug}/guest-check`);
}
```

#### Обновление GuestStatusResponse

```typescript
export interface GuestStatusResponse {
  status: "pending" | "approved" | "denied";
  // token убран — приходит в Set-Cookie
}
```

`GuestApproveResponse` тип удалить — больше не используется на клиенте.

#### Расширение PrejoinView

Новые пропсы:

```typescript
interface PrejoinViewProps {
  roomUrl: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: () => void;
  guestState?: "idle" | "waiting" | "denied" | "error";
  errorMessage?: string;
  onRetry?: () => void;
}
```

Отображение:
- `idle` (default) — текущий вид с кнопкой "Join Room"
- `waiting` — спиннер "Waiting for room owner to approve...", поле имени `readOnly`
- `denied` — сообщение + кнопка "Try Again" → `onRetry`, поле имени `readOnly`
- `error` — `errorMessage` + кнопка "Try Again" → `onRetry`, поле имени `readOnly`

Поле `displayName` блокируется (`readOnly`) при любом `guestState !== "idle"`.
Оверлей поверх `DeviceSelector` (или замена контента под `DeviceSelector`).

#### Перепись RoomPage

1. Убрать импорт/рендер `GuestJoinForm`
2. State: `guestPreApproved: boolean`, `requestId: string | null`, `guestState: GuestState`, `errorMessage: string`
3. На mount: если `!user` → `roomApi.guestCheck(slug)`
   - `valid: true` → `guestPreApproved = true`, `displayName` из ответа (locked)
   - `valid: false` → обычный flow
4. `handleJoin()`:
   - `user` (authenticated) → `setViewState("active")`
   - `!user && guestPreApproved` → `setViewState("active")`
   - `!user && !guestPreApproved` → `roomApi.guestRequest(slug, displayName)`,
     сохранить `requestId`, переключить `guestState` в `"waiting"`, запуск polling
5. Polling `guestStatus(slug, requestId)` каждые 2с (cleanup в `useEffect` return):
   - `approved` → `setViewState("active")` (cookie уже установлен сервером)
   - `denied` → `guestState = "denied"`
   - error → `guestState = "error"`, `errorMessage` из ошибки
6. `onRetry` → сбросить `guestState = "idle"`, `requestId = null`
7. `guestTokenRef` убрать — токен теперь в HTTP-only cookie
8. Всегда рендерить `<PrejoinView>` с `guestState`/`errorMessage`/`onRetry`

#### Удаление файлов

- `apps/client/src/features/room/components/guest-join-form.tsx`

## Acceptance Criteria

- [ ] Все пользователи (авторизованные и гости) видят один и тот же `PrejoinView`
- [ ] Гость без токена: "Join Room" → отправка запроса → "Waiting for approval..." → вход после одобрения
- [ ] При approved сервер ставит HTTP-only cookie с гостевым JWT
- [ ] Повторный заход гостя: `guest-check` читает cookie → если валиден → вход без запроса
- [ ] Cookie `httpOnly`, `sameSite=lax`, TTL 2ч, `path=/`
- [ ] Поле displayName недоступно для редактирования после отправки запроса
- [ ] `guest-join-form.tsx` удалён
- [ ] Тесты обновлены

## Related Files

### Сервер

- `apps/server/src/room/guest.service.ts` — добавить `validateGuestToken()`
- `apps/server/src/room/room.controller.ts` — добавить `guest-check`, модифицировать `guestStatus`
- `apps/server/src/room/guest.service.spec.ts` — обновить тесты

### Клиент

- `apps/client/src/routes/room.tsx` — переписать flow
- `apps/client/src/features/room/components/prejoin-view.tsx` — расширить состояниями
- `apps/client/src/features/room/services/room-api.ts` — добавить `guestCheck()`, обновить типы
- `apps/client/src/features/room/components/guest-join-form.tsx` — удалить
- `apps/client/src/routes/__tests__/room.test.tsx` — обновить тесты
