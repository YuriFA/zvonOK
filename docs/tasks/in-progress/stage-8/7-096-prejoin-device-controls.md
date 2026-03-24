# TASK-096 — Prejoin Device Controls Redesign

> **Status:** completed
> **Priority:** high
> **Created:** 2026-03-24

---

## Description

Редизайн prejoin-view: компактный layout + объединённое управление устройствами в одном ряду.

## Scope

- Новый компонент DeviceControlGroup (toggle + device dropdown в одной группе)
- Компактный вариант CopyLink
- Обновление DeviceSelector для использования DeviceControlGroup
- Упрощение layout в PrejoinView

## Technical Design

### DeviceControlGroup

Кнопка устройства в виде группы из двух частей:
- **Toggle button** — включает/выключает устройство
- **Dropdown button** — открывает список устройств

Props:
- `type: 'videoinput' | 'audioinput' | 'audiooutput'`
- `isEnabled: boolean`
- `onToggle: () => void`
- `devices: MediaDevice[]`
- `selectedDeviceId: string | null`
- `onDeviceChange: (id: string) => void`
- `disabled?: boolean`

### Layout

Горизонтальный ряд из 3 кнопок под превью:
- Микрофон (audioinput)
- Динамик (audiooutput) — только если поддерживается браузером
- Камера (videoinput)

### CopyLink compact

Только кнопка Copy без input поля.

## Acceptance Criteria

- [x] На среднем экране (768px height) весь контент помещается без скролла
- [x] Три кнопки устройств в ряд: микрофон, динамик, камера
- [x] Каждая кнопка имеет toggle + dropdown выбора устройства (для speaker только dropdown)
- [x] CopyLink имеет компактный вариант
- [x] Динамик показывается только если поддерживается браузером

## Related Files

- `apps/client/src/features/media/components/device-control-group.tsx` (new)
- `apps/client/src/features/media/components/device-selector.tsx`
- `apps/client/src/features/room/components/prejoin-view.tsx`
- `apps/client/src/components/ui/copy-link.tsx`
