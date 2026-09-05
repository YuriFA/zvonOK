# Client Module (React Frontend)

## Purpose

React 19 + Vite frontend for the WebRTC chat application. Handles user authentication, room management, WebRTC connections, and UI rendering.

---

## Use Cases

### 1. User Authentication Flow
- User visits `/` or `/room/:code`
- If not authenticated, show login/register options
- After login, store user in AuthContext
- Auto-refresh access token before expiration

### 2. Room Management
- User creates room (generates random code)
- User joins room by code
- Display active rooms (user's rooms list)

### 3. SFU Connection (Group Calls)
- Connect to signalling server via Socket.io
- Join SFU room
- Create send/receive Transports
- Produce local audio/video
- Consume remote audio/video

### 4. Media Controls
- Mute/unmute microphone
- Enable/disable camera
- Share/stop sharing screen
- Switch camera/microphone/speaker devices

---

## Routes

| Route | Component | Auth Required | Lazy | Description |
|-------|-----------|---------------|------|-------------|
| `/` | `HomePage` | No | No | Main home page, create/join rooms |
| `/login` | `LoginPage` | No (redirect if authed) | No | Email/password login |
| `/register` | `RegisterPage` | No (redirect if authed) | No | User registration |
| `/room/:slug` | `RoomPage` | Optional | **Yes** | Room with pre-join, active call, ended states |

---

## Global State
### AuthContext
```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
```

> **Note:** `register()` parameter order is `(username, email, password)`, not `(email, username, password)` as documented in some module docs.

---

## Component Tree
```
Browser
├── [React Router v7]
│    ├── /            → HomePage (eager)
│    ├── /login       → LoginPage (eager)
│    ├── /register    → RegisterPage (eager)
│    └── /room/:slug  → RoomPage (lazy — separate chunk)
│
├── [AuthProvider]  ← wraps entire app tree
│    ├── AuthContext / useAuth()
│    ├── authApi (service) → ApiClient ─────────────────► NestJS REST /*
│    │                                               (credentials:include, 401→auto-refresh)
│
├── [HomePage]
│    ├── useCreateRoom, useRoom, useRooms, useEndRoom (TanStack Query)
│    └── roomApi → ApiClient
│
├── [LoginPage / RegisterPage]
│    └── React Hook Form + Zod → authApi
│
└── [RoomPage]  ← lazy loaded
     │
     ├── [PreJoinView]
     │    ├── MediaStreamProvider / useMediaStream()
     │    │    └── MediaManager
     │    │         ├── MediaAcquisition → navigator.mediaDevices
     │    │         └── DeviceService (device listing)
     │    └── DeviceControlGroup / DeviceSettingsPanel
     │
     ├── [ActiveRoomView]
     │    └── SfuProvider / useSfu()
     │         └── SfuManager
     │              ├── SfuConnection → socket.io WSS /sfu → NestJS
     │              ├── EventRouter (sfu:* event routing)
     │              ├── mediasoup-client Device → RTCPeerConnection
     │              └── StatsCollector → qualityScore
     │                   └── RemoteAudioMixer (Web Audio API)
     │
     └── [CallEndedView]
```

---

## Feature Directories
### `features/auth/`
| Component | File |
|-----------|------|
| `AuthContext` / `AuthProvider` | `features/auth/contexts/auth.context.tsx` |
| `LoginForm` / `RegisterForm` | `features/auth/components/login-form.tsx`, `register-form.tsx` |
| `ProfileDropdown` | `features/auth/components/profile-dropdown.tsx` |
| `AuthHeader` | `features/auth/components/auth-header.tsx` |
| `authApi` | `features/auth/services/auth-api.ts`` |
| `AuthTypes` | `features/auth/types/auth.types.ts`` |
| Login/Register schemas | `features/auth/validation/` |

### `features/room/`
| Component | file |
|-----------|------|
| `ActiveRoomView` | `features/room/components/active-room-view.tsx` |
| `CallEndedView` | `features/room/components/call-ended-view.tsx` |
| `ConnectionStatus` | `features/room/components/connection-status.tsx` |
| `PreJoinView` | `features/room/components/prejoin-view.tsx` |
| `RoomAlerts` | `features/room/components/room-alerts.tsx` |
| `RoomHeader` | `features/room/components/room-header.tsx` |
| `RoomView` | `features/room/components/room-view.tsx` |
| `useActiveSpeaker` | `features/room/hooks/use-active-speaker.ts` |
| `useCreateRoom` | `features/room/hooks/use-create-room.ts` |
| `useEndRoom` | `features/room/hooks/use-end-room.ts` |
| `useRoom` | `features/room/hooks/use-room.ts` |
| `useRoomParticipants` | `features/room/hooks/use-room-participants.ts` |
| `useRoomSfu` | `features/room/hooks/use-room-sfu.ts` |
| `useRoomSession` | `features/room/hooks/use-room-session.ts` |
| `roomApi` | `features/room/services/room-api.ts` |
| `RoomTypes` | `features/room/types/room.types.ts` |

### `features/media/`
| Component | file |
|-----------|------|
| `MediaStreamProvider` | `features/media/contexts/media-stream.context.tsx` |
| `MediaManagerProvider` | `features/media/contexts/media-manager.context.tsx` |
| `MediaControls` | `features/media/components/media-controls.tsx` |
| `DeviceControlGroup` | `features/media/components/device-control-group.tsx` |
| `DeviceSelector` | `features/media/components/device-selector.tsx` |
| `DeviceSettingsPanel` | `features/media/components/device-settings-panel.tsx` |
| `PermissionRequestModal` | `features/media/components/permission-request-modal.tsx` |
| `SingleDeviceSelector` | `features/media/components/single-device-selector.tsx` |
| `SpeakerDeviceControlGroup` | `features/media/components/speaker-device-control-group.tsx` |
| `ActiveDeviceDisplay` | `features/media/components/active-device-display.tsx` |
| `useDeviceSwitching` | `features/media/hooks/use-device-switching.ts` |
| `useMediaControls` | `features/media/hooks/use-media-controls.ts` |
| `useMediaDevices` | `features/media/hooks/use-media-devices.ts` |
| `useSfuTrackSync` | `features/media/hooks/use-sfu-track-sync.ts` |

### `features/sfu/`
| Component | file |
|-----------|------|
| `SfuProvider` | `features/sfu/contexts/sfu-manager.context.tsx` |

---

## Library Directories
### `lib/api/`
| Component | file |
|-----------|------|
| `ApiClient` | `lib/api/api-client.ts` |
| `api.errors.ts` | `lib/api/api.errors.ts` |

### `lib/sfu/`
| Component | file |
|-----------|------|
| `SfuManager` | `lib/sfu/manager.ts` |
| `SfuConnection` | `lib/sfu/connection.ts` |
| `EventRouter` | `lib/sfu/event-router.ts` |
| `StatsCollector` | `lib/sfu/stats-collector.ts` |
| `qualityScore` | `lib/sfu/quality-score.ts` |
| `interfaces.ts`, `types.ts` | `lib/sfu/` |

### `lib/media/`
| Component | file |
|-----------|------|
| `MediaManager` | `lib/media/manager.ts` |
| `MediaAcquisition` | `lib/media/capture.ts` |
| `CaptureState` | `lib/media/capture-state.ts` |
| `DeviceService` | `lib/media/device-service.ts` |
| `ErrorClassifier` | `lib/media/error-classifier.ts` |
| `ManagerFactory` | `lib/media/manager-factory.ts` |
| `interfaces.ts`, `types.ts` | `lib/media/` |

### `lib/audio/`
| Component | file |
|-----------|------|
| `RemoteAudioMixer` | `lib/audio/remote-audio-mixer.ts` |

### `lib/react-query/`
| Component | file |
|-----------|------|
| `QueryClient` config | `lib/react-query/query-client.ts` |
| `QueryKeys` | `lib/react-query/query-keys.ts` |

### `lib/config/`
| Component | file |
|-----------|------|
| `app.ts` | App configuration |
| `media.ts` | Media configuration |
| `routes.ts` | Route constants |
| `themes.ts` | Theme configuration |

### `lib/constants/`
| Component | file |
|-----------|------|
| `storage-keys.ts` | localStorage key constants |

---

## Component Directory (shared)
### `components/ui/` (@base-ui/react + Tailwind v4)
| Component | file |
|-----------|------|
| `Alert` | `alert.tsx` |
| `Button` | `button.tsx` |
| `ButtonGroup` | `button-group.tsx` |
| `Card` | `card.tsx` |
| `CopyLink` | `copy-link.tsx` |
| `Dialog` | `dialog.tsx` |
| `DropdownMenu` | `dropdown-menu.tsx` |
| `Input` | `input.tsx` |
| `Label` | `label.tsx` |
| `LinkButton` | `link-button.tsx` |
| `Separator` | `separator.tsx` |
| `Sonner` (toast) | `sonner.tsx` |
| `ThemeSwitcher` | `theme-switcher.tsx` |
| `Tooltip` | `tooltip.tsx` |

### `components/room/`
| Component | file |
|-----------|------|
| `ParticipantItem` | `ParticipantItem.tsx` |
| `ParticipantsList` | `ParticipantsList.tsx` |
| `QualityIndicator` | `QualityIndicator.tsx` |

### `components/` (root)
| Component | file |
|-----------|------|
| `VideoGrid` | `video-grid.tsx` |
| `LocalVideo` | `local-video.tsx` |
| `RemoteVideo` | `remote-video.tsx` |
| `RemoteAudio` | `remote-audio.tsx` |

### `hooks/`
| Hook | file |
|-----------|------|
| `useMediasoup` | `hooks/use-mediasoup.ts` |
| `useRemoteAudio` | `hooks/use-remote-audio.ts` |

---

## API Endpoints Consumed

| Method | Path | Usage |
|--------|------|-------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with credentials |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/me` | Get current user |
| GET | `/rooms/:slug` | Get room info |
| POST | `/rooms` | Create new room |
| PATCH | `/rooms/:id` | Update room |
| DELETE | `/rooms/:id` | End room |
| PATCH | `/users/:id/role` | Update user role (admin) |

---

## Data Fetching Strategy (React Query)

TanStack React Query for server state management.

### React Query Hooks

| Hook | Purpose |
|------|---------|
| `useRoom(slug)` | Fetch single room by slug |
| `useCreateRoom()` | Create room mutation |
| `useEndRoom()` | End room mutation |
| `useRooms()` | List user's rooms (if available) |

### QueryClient Configuration

```typescript
{
  queries: {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  mutations: {
    retry: 1,
  },
}
```

---

## WebSocket Events Consumed

See [SFU Module](./sfu.md) for the complete SFU event list.

 All events use the `/sfu` namespace via socket.io.

---

## Environment Variables

**`.env.local`**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Edge Cases

### Token Refresh Failure
- Auto-logout user
- Redirect to login page
- Clear local state

### WebSocket Disconnect
- Show connection status indicator
- attempt reconnection (Socket.io auto)
- re-join room on reconnect

### WebRTC Connection Failure
- Display error message
- fallback to audio-only
- offer TURN server retry

### Device Permission Denied
- Show error message with instructions
- allow retry after granting permission
- handle no devices available

### Screen Share Not Supported
- hide screen share button
- check `navigator.mediaDevices.getDisplayMedia` availability
