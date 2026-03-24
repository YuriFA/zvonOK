# TASK-097 — Display Name in Prejoin

> **Status:** completed
> **Priority:** high
> **Created:** 2026-03-24

---

## Description

Add a display name input field to prejoin-view for customizing the name shown during a call.

**Behavior:**
- Authenticated users: pre-filled with `user.username`, editable
- Guests: "Guest" by default, editable, persisted in localStorage
- In call: initials (2 letters) shown when camera is off
- In call: full name shown in video overlay

## Scope

- Display name input in PrejoinView
- Pass displayName through RoomPage → RoomView → useRoomSession → useMediasoup
- getInitials(name) utility → 2 letters
- Update LocalVideo and RemoteVideo to show initials and full name
- localStorage persistence for guests

## Technical Design

### Backend — No changes required

`SfuJoinPayload` already contains `username: string` — backend is ready to accept and broadcast the name.

### Frontend

#### 1. Display name utility

New file `apps/client/src/lib/utils/display-name.ts`:

```ts
const STORAGE_KEY = 'zvonok:guest_display_name';

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function loadGuestDisplayName(): string {
  return localStorage.getItem(STORAGE_KEY) || 'Guest';
}

export function saveGuestDisplayName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}
```

#### 2. PrejoinView

Add name input next to Join button:

```tsx
interface PrejoinViewProps {
  room: Room;
  roomUrl: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  onJoin: () => void;
}
```

Layout:
```
[DeviceSelector]

[Input: Your name] [CopyLink] [Join Room]
```

#### 3. RoomPage

State for displayName:
- Initialize: `user?.username ?? loadGuestDisplayName()`
- Pass to PrejoinView and RoomView
- Save on Join (for guests)

#### 4. RoomView → useRoomSession → useMediasoup

Propagate displayName through props to useMediasoup, where it's used in `joinRoom()`.

#### 5. LocalVideo / RemoteVideo

Update display:
- When camera off: circle with initials (2 letters)
- Overlay: full name

## Acceptance Criteria

- [x] Name input next to Join button in PrejoinView
- [x] Authenticated users: pre-filled with user.username, editable
- [x] Guests: "Guest" by default, editable, persisted in localStorage
- [x] In call: initials (2 letters) when camera is off
- [x] In call: full name in video overlay
- [x] Backend correctly broadcasts username to participants

## Related Files

- `apps/client/src/lib/utils/display-name.ts` (new)
- `apps/client/src/routes/room.tsx`
- `apps/client/src/features/room/components/prejoin-view.tsx`
- `apps/client/src/features/room/components/room-view.tsx`
- `apps/client/src/features/room/hooks/use-room-session.ts`
- `apps/client/src/hooks/use-mediasoup.ts`
- `apps/client/src/components/local-video.tsx`
- `apps/client/src/components/remote-video.tsx`
