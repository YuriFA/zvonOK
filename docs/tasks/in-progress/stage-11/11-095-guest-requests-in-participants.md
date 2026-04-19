# TASK-095 — Guest requests в ParticipantsList для owner

> **Status:** done
> **Priority:** medium
> **Created:** 2026-04-19

---

## Description

Показывать список ожидающих запросов гостей в `ParticipantsList` ниже подтверждённых участников.
Только для owner. У каждого запроса — кнопки Approve / Deny.

## Scope

- Создать `GuestRequestsContext` в `features/room/context/`
- Подписаться на `sfuManager.onGuestJoinRequest` в провайдере
- Предоставить методы `approveRequest` / `denyRequest` через контекст
- Обернуть активный вид провайдером в `room.tsx`
- Обновить `GuestApprovalDialog` — использовать контекст вместо локального state
- Обновить `ParticipantsList` — секция "Pending Requests" с кнопками Approve/Deny
- Обновить `active-room-view.tsx` — передать pending requests в `ParticipantsList`

## Technical Design

### GuestRequestsContext

```ts
interface GuestRequestsContextValue {
  pendingRequests: SfuGuestJoinRequestPayload[];
  approveRequest: (requestId: string) => Promise<void>;
  denyRequest: (requestId: string) => Promise<void>;
}
```

Провайдер принимает `roomSlug`. Подписывается на `sfuManager.onGuestJoinRequest`,
после approve/deny удаляет запрос из списка.

### ParticipantsList

Новые пропсы (опциональные):
```ts
pendingRequests?: SfuGuestJoinRequestPayload[];
onApproveRequest?: (requestId: string) => Promise<void>;
onDenyRequest?: (requestId: string) => Promise<void>;
```

Секция отображается только если `isOwner && pendingRequests.length > 0`.

## Acceptance Criteria

- [ ] Контекст создан, данные шарятся между диалогом и списком
- [ ] `GuestApprovalDialog` использует контекст
- [ ] `ParticipantsList` показывает pending-секцию для owner
- [ ] Approve/Deny работают и убирают запрос из обоих мест
- [ ] Типизация без ошибок (`pnpm -C apps/client build`)

## Related Files

- `apps/client/src/features/room/context/guest-requests-context.tsx` (new)
- `apps/client/src/features/room/components/guest-approval-dialog.tsx`
- `apps/client/src/components/room/participants-list.tsx`
- `apps/client/src/features/room/components/active-room-view.tsx`
- `apps/client/src/routes/room.tsx`
