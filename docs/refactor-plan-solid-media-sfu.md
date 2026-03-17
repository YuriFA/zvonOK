# SOLID Refactor Plan: Media & SFU Modules

## Executive Summary

This plan addresses SOLID principle violations in the WebRTC media and SFU layers:

| File | Primary Violations | Priority |
|------|-------------------|----------|
| `lib/media/manager.ts` | SRP (god object), OCP (hardcoded fallbacks) | High |
| `lib/sfu/manager.ts` | SRP (god object), OCP (monolithic handlers), ISP | High |
| `hooks/use-mediasoup.ts` | SRP (mixed concerns), DIP (singleton) | Medium |
| `features/media/hooks/use-media-controls.ts` | DIP, LSP (misleading names) | Medium |
| `features/media/components/device-selector.tsx` | DIP (direct manager access) | Low |

---

## Implementation Status

> **Last updated:** 2026-03-17

### Completed Phases

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Extract Interfaces | **Done** | `lib/media/interfaces.ts`, `lib/media/types.ts`, `lib/sfu/interfaces.ts`, `lib/sfu/types.ts` created |
| Phase 2: Split MediaStreamManager | **Done** | Extracted to `state-store.ts`, `acquisition.ts`, `track-controller.ts`, `permissions.ts`; `manager.ts` is now a facade |
| Phase 3: Split SfuManager (partial) | **Partial** | Extracted `connection.ts`, `event-router.ts`, `stats-collector.ts`; `manager.ts` still 700+ lines (target was <200). Transport, producer, consumer, and peer-registry extractions are **deferred**. |
| Phase 4: Dependency Injection | **Done** | `MediaManagerProvider`/`SfuManagerProvider` contexts created; hooks use DI |
| Phase 5: Fix Components | **Done** | `device-selector.tsx` uses DI via hooks |
| Phase 6: Testing | **Done** | Mock factories created in `__mocks__/manager.ts` for both media and SFU |

### Bug Fixes Applied (2026-03-17)

1. **Double-produce race condition (HIGH):** Added `producingInProgress` guard in `SfuManager.produce()` to deduplicate concurrent produce calls for the same track kind. The guard returns the pending promise if a produce for that kind is already in-flight, and also skips if a producer already exists. This fixes the race between `useMediasoup`'s auto-produce effect and `useRoomSfu`'s manual `toggleVideo`/`toggleAudio`.

2. **Silent error swallowing in device-selector.tsx (MEDIUM):** Changed `MediaStreamManager.toggleVideo()`/`toggleAudio()` from `void` (fire-and-forget) to `async` returning `Promise<boolean>`. Updated `device-selector.tsx` to properly await the result and revert UI state on failure. Updated `IMediaTrackController` interface and mock accordingly.

3. **Duplicated preferredVideoEnabled state (LOW):** Removed `preferredVideoEnabled`/`preferredAudioEnabled` from `MediaAcquisition`. Introduced `MediaPreferenceProvider` interface so `acquisition.ts` reads preferences from `MediaTrackController` (the single source of truth) via a callback, eliminating state drift between the two classes.

4. **`closeAll()` made private (LOW):** Changed `SfuManager.closeAll()` from `public` to `private`. All 4 call sites are internal (`disconnect`, `leaveRoom`, `handleDisconnected`, `handleKicked`).

### Remaining Work

- **SFU decomposition:** `SfuManager` is still ~700 lines. The proposed extractions (`room-membership.ts`, `transport-manager.ts`, `producer-manager.ts`, `consumer-manager.ts`, `peer-registry.ts`) have not been created. This is deferred as a future refactoring pass.
- **`device-selector.ts` extraction:** The plan proposed a separate `lib/media/device-selector.ts` module, but device-switching logic was implemented inside `track-controller.ts` instead. This is acceptable and the plan is updated to reflect this.
- **`useMediaControls` enableVideo/disableVideo API:** The plan proposed `enableVideo`/`disableVideo`/`toggleVideo` methods on `useMediaControls` that actually start/stop tracks. The current implementation uses `setVideoEnabled`/`setAudioEnabled` which only set preferences. The `device-selector.tsx` now handles this by calling `mediaManager.toggleVideo()` directly. A future pass could consolidate this into the hook.

---

## Phase 1: Extract Interfaces & Contracts

**Goal:** Establish abstraction boundaries before refactoring implementations.

### 1.1 Media Interfaces

Create `apps/client/src/lib/media/types.ts` (split from manager.ts):

```typescript
// Status & events
export type MediaStatus = 'idle' | 'starting' | 'active' | 'stopped' | 'error';
export type MediaStatusCallback = (status: MediaStatus) => void;
export type TrackAvailabilityCallback = (available: boolean, reason?: string) => void;

// Constraints (renamed to avoid shadowing browser's MediaStreamConstraints)
export interface UserMediaConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

// Permissions
export interface MediaPermissionStatus {
  hasVideo: boolean;
  hasAudio: boolean;
  videoPermission: PermissionState | 'unknown';
  audioPermission: PermissionState | 'unknown';
}

// Device info
export interface MediaDeviceInfo {
  deviceId: string;
  kind: 'videoinput' | 'audioinput';
  label: string;
}
```

Create `apps/client/src/lib/media/interfaces.ts`:

```typescript
import type { UserMediaConstraints, MediaPermissionStatus, MediaStatus, TrackAvailabilityCallback, MediaStatusCallback } from './types';

/**
 * Responsible for acquiring and releasing media streams.
 * Single responsibility: getUserMedia orchestration.
 */
export interface IMediaAcquisition {
  startStream(constraints?: UserMediaConstraints): Promise<MediaStream>;
  stopStream(): void;
  getStream(): MediaStream | null;
}

/**
 * Responsible for individual track lifecycle.
 * Single responsibility: track start/stop/replace operations.
 */
export interface IMediaTrackController {
  startVideoTrack(): Promise<MediaStreamTrack | null>;
  stopVideoTrack(reason?: string): void;
  startAudioTrack(): Promise<MediaStreamTrack | null>;
  stopAudioTrack(reason?: string): void;
  hasVideoTrack(): boolean;
  hasAudioTrack(): boolean;
  isVideoEnabled(): boolean;
  isAudioEnabled(): boolean;
  isPreferredVideoEnabled(): boolean;
  isPreferredAudioEnabled(): boolean;
  setPreferredVideoEnabled(enabled: boolean): void;
  setPreferredAudioEnabled(enabled: boolean): void;
}

/**
 * Responsible for device selection and switching.
 * Single responsibility: device enumeration and selection.
 */
export interface IMediaDeviceSelector {
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null>;
  switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null>;
  getVideoDeviceId(): string | null;
  getAudioDeviceId(): string | null;
  setSelectedVideoDeviceId(deviceId: string | null): void;
  setSelectedAudioDeviceId(deviceId: string | null): void;
}

/**
 * Responsible for permission checking.
 * Single responsibility: permission queries.
 */
export interface IMediaPermissionChecker {
  checkPermissions(): Promise<MediaPermissionStatus>;
}

/**
 * Observable media state.
 * Single responsibility: state broadcasting.
 */
export interface IMediaStateNotifier {
  getStatus(): MediaStatus;
  onStatusChange(callback: MediaStatusCallback): () => void;
  onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void;
  onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void;
}

/**
 * Facade combining all media concerns.
 * Use this as the default injection token.
 */
export interface IMediaManager extends
  IMediaAcquisition,
  IMediaTrackController,
  IMediaDeviceSelector,
  IMediaPermissionChecker,
  IMediaStateNotifier {}
```

### 1.2 SFU Interfaces

Create `apps/client/src/lib/sfu/interfaces.ts`:

```typescript
import type { Socket } from 'socket.io-client';
import type { Consumer, Producer, Transport, RtpCapabilities } from 'mediasoup-client/types';
import type {
  SfuState,
  SfuStateCallback,
  SfuTrackCallback,
  SfuPeerCallback,
  SfuPeerInfo,
  SfuKickedPayload,
  SfuJoinPayload,
  QualityStatsCallback,
  PeerQualityStats,
} from './types';

/**
 * Responsible for socket connection lifecycle.
 * Single responsibility: connect/disconnect/reconnect.
 */
export interface ISfuConnection {
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  getSocket(): Socket | null;
}

/**
 * Responsible for room join/leave operations.
 * Single responsibility: room membership signaling.
 */
export interface ISfuRoomMembership {
  joinRoom(payload: SfuJoinPayload): Promise<void>;
  leaveRoom(): void;
  kickPeer(userId: string): boolean;
  onKicked(callback: (payload: SfuKickedPayload) => void): () => void;
}

/**
 * Responsible for producing local tracks.
 * Single responsibility: producer lifecycle.
 */
export interface ISfuProducerManager {
  produce(track: MediaStreamTrack): Promise<Producer | null>;
  pauseProducer(producerId: string): void;
  resumeProducer(producerId: string): void;
  closeProducer(kind: 'audio' | 'video'): void;
  replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<boolean>;
  getProducerByKind(kind: 'audio' | 'video'): Producer | undefined;
}

/**
 * Responsible for peer tracking.
 * Single responsibility: peer registry.
 */
export interface ISfuPeerRegistry {
  getPeers(): Map<string, SfuPeerInfo>;
  getPeer(userId: string): SfuPeerInfo | undefined;
  onPeerJoined(callback: SfuPeerCallback): () => void;
  onPeerLeft(callback: (userId: string) => void): () => void;
}

/**
 * Responsible for quality statistics.
 * Single responsibility: stats collection and scoring.
 */
export interface ISfuStatsCollector {
  startStatsCollection(intervalMs?: number): void;
  stopStatsCollection(): void;
  onQualityStats(callback: QualityStatsCallback): () => void;
  getStats(): Map<string, PeerQualityStats>;
}

/**
 * Responsible for SFU state broadcasting.
 * Single responsibility: state events.
 */
export interface ISfuStateNotifier {
  getState(): SfuState;
  onStateChange(callback: SfuStateCallback): () => void;
  onTrack(callback: SfuTrackCallback): () => void;
}

/**
 * Facade combining all SFU concerns.
 * Note: Transport management (device, send/recv transports) is an internal
 * implementation detail and not exposed on the public interface.
 */
export interface ISfuManager extends
  ISfuConnection,
  ISfuRoomMembership,
  ISfuProducerManager,
  ISfuPeerRegistry,
  ISfuStateNotifier {}
```

### 1.3 Quality Scoring Service

Extract to `apps/client/src/lib/sfu/quality-score.ts`:

```typescript
import type { QualityStats, QualityScore } from './types';

export function calculateQualityScore(stats: QualityStats): QualityScore {
  // Move existing implementation from manager.ts
}

export function getDefaultQualityScore(): QualityScore {
  return { level: 'good', score: 70 };
}
```

---

## Phase 2: Split MediaStreamManager

**Goal:** Break the 699-line god object into focused classes.

### 2.1 New File Structure

```
lib/media/
├── types.ts              # Shared types (new)
├── interfaces.ts         # Contracts (new)
├── acquisition.ts        # Stream acquisition + fallback policies (new)
├── track-controller.ts   # Track start/stop/replace (new)
├── device-selector.ts    # Device enumeration/switching (new)
├── permissions.ts        # Permission checking (new)
├── state-store.ts        # Observable state (new)
└── manager.ts            # Facade composing above (refactored)
```

### 2.2 Implementation Steps

#### Step 2.2.1: Extract State Store

`apps/client/src/lib/media/state-store.ts`:

```typescript
import type { MediaStatus, MediaStatusCallback, TrackAvailabilityCallback } from './types';

export class MediaStateStore {
  private status: MediaStatus = 'idle';
  private videoAvailable = false;
  private audioAvailable = false;
  private statusCallbacks = new Set<MediaStatusCallback>();
  private videoAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();
  private audioAvailabilityCallbacks = new Set<TrackAvailabilityCallback>();

  getStatus(): MediaStatus {
    return this.status;
  }

  setStatus(status: MediaStatus): void {
    this.status = status;
    this.statusCallbacks.forEach(cb => cb(status));
  }

  onStatusChange(callback: MediaStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    callback(this.status);
    return () => this.statusCallbacks.delete(callback);
  }

  notifyVideoAvailability(available: boolean, reason?: string): void {
    this.videoAvailable = available;
    this.videoAvailabilityCallbacks.forEach(cb => cb(available, reason));
  }

  notifyAudioAvailability(available: boolean, reason?: string): void {
    this.audioAvailable = available;
    this.audioAvailabilityCallbacks.forEach(cb => cb(available, reason));
  }

  onVideoAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    this.videoAvailabilityCallbacks.add(callback);
    callback(this.videoAvailable);
    return () => this.videoAvailabilityCallbacks.delete(callback);
  }

  onAudioAvailabilityChange(callback: TrackAvailabilityCallback): () => void {
    this.audioAvailabilityCallbacks.add(callback);
    callback(this.audioAvailable);
    return () => this.audioAvailabilityCallbacks.delete(callback);
  }

  reset(): void {
    this.status = 'idle';
    this.videoAvailable = false;
    this.audioAvailable = false;
    this.statusCallbacks.clear();
    this.videoAvailabilityCallbacks.clear();
    this.audioAvailabilityCallbacks.clear();
  }
}
```

#### Step 2.2.2: Extract Acquisition with Strategy Pattern

`apps/client/src/lib/media/acquisition.ts`:

```typescript
import type { UserMediaConstraints } from './types';
import { MediaStateStore } from './state-store';

export interface AcquisitionFallbackStrategy {
  canHandle(error: Error): boolean;
  execute(
    error: Error,
    originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream>;
}

export class PermissionDeniedStrategy implements AcquisitionFallbackStrategy {
  canHandle(error: Error): boolean {
    return error.name === 'NotAllowedError';
  }

  async execute(
    error: Error,
    originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream> {
    if (originalConstraints.audio) {
      return attemptFallback({ audio: originalConstraints.audio });
    }
    throw error;
  }
}

export class DeviceNotFoundStrategy implements AcquisitionFallbackStrategy {
  canHandle(error: Error): boolean {
    return error.name === 'NotFoundError' || error.name === 'OverconstrainedError';
  }

  async execute(
    error: Error,
    originalConstraints: UserMediaConstraints,
    attemptFallback: (constraints: UserMediaConstraints) => Promise<MediaStream>
  ): Promise<MediaStream> {
    return attemptFallback({ video: true, audio: true });
  }
}

export class MediaAcquisition {
  private stream: MediaStream | null = null;
  private pendingPromise: Promise<MediaStream> | null = null;
  private cancelled = false;

  constructor(
    private stateStore: MediaStateStore,
    private fallbackStrategies: AcquisitionFallbackStrategy[] = []
  ) {}

  async start(constraints?: UserMediaConstraints): Promise<MediaStream> {
    this.cancelled = false;

    if (this.stream) return this.stream;
    if (this.pendingPromise) return this.pendingPromise;

    this.pendingPromise = this.doStart(constraints);
    try {
      return await this.pendingPromise;
    } finally {
      this.pendingPromise = null;
    }
  }

  private async doStart(constraints?: UserMediaConstraints): Promise<MediaStream> {
    this.stateStore.setStatus('starting');
    
    const merged = this.mergeConstraints(constraints);
    const wantsVideo = merged.video !== false;
    const wantsAudio = merged.audio !== false;

    if (!wantsVideo && !wantsAudio) {
      this.stream = new MediaStream();
      this.stateStore.setStatus('active');
      return this.stream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(merged);
      this.checkCancelled(stream);
      this.stream = stream;
      this.stateStore.setStatus('active');
      return stream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      
      if (this.cancelled) {
        this.stateStore.setStatus('stopped');
        throw new Error('Stream start was cancelled');
      }

      for (const strategy of this.fallbackStrategies) {
        if (strategy.canHandle(error)) {
          try {
            const stream = await strategy.execute(error, merged, async (c) => {
              const s = await navigator.mediaDevices.getUserMedia(c);
              this.checkCancelled(s);
              return s;
            });
            this.stream = stream;
            this.stateStore.setStatus('active');
            return stream;
          } catch {
            if (this.cancelled) {
              this.stateStore.setStatus('stopped');
              throw new Error('Stream start was cancelled');
            }
            continue;
          }
        }
      }

      this.stateStore.setStatus('error');
      throw error;
    }
  }

  private checkCancelled(stream: MediaStream): void {
    if (this.cancelled) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('Stream start was cancelled');
    }
  }

  stop(): void {
    this.cancelled = true;
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.stateStore.setStatus('stopped');
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  private mergeConstraints(constraints?: UserMediaConstraints): UserMediaConstraints {
    return {
      video: constraints?.video ?? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: constraints?.audio ?? { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    };
  }
}
```

#### Step 2.2.3: Extract Track Controller

`apps/client/src/lib/media/track-controller.ts`:

```typescript
import { MediaStateStore } from './state-store';
import type { UserMediaConstraints } from './types';

export class MediaTrackController {
  private preferredVideoEnabled = true;
  private preferredAudioEnabled = true;
  private selectedVideoDeviceId: string | null = null;
  private selectedAudioDeviceId: string | null = null;

  constructor(
    private getStream: () => MediaStream | null,
    private stateStore: MediaStateStore
  ) {}

  async startVideoTrack(): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    if (!stream) return null;

    this.preferredVideoEnabled = true;

    const existing = stream.getVideoTracks()[0];
    // BUG FIX: Check readyState to avoid returning a stopped (ended) track
    if (existing && existing.readyState !== 'ended') {
      existing.enabled = true;
      this.stateStore.notifyVideoAvailability(true);
      return existing;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: this.buildVideoConstraints(this.selectedVideoDeviceId)
      });
      const track = newStream.getVideoTracks()[0];
      if (!track) {
        newStream.getTracks().forEach(t => t.stop());
        return null;
      }
      this.selectedVideoDeviceId = track.getSettings().deviceId ?? null;
      stream.addTrack(track);
      this.stateStore.notifyVideoAvailability(true);
      newStream.getAudioTracks().forEach(t => t.stop());
      return track;
    } catch (err) {
      this.stateStore.notifyVideoAvailability(false, err instanceof Error ? err.message : 'Failed to access camera');
      return null;
    }
  }

  stopVideoTrack(reason = 'Camera turned off'): void {
    const stream = this.getStream();
    this.preferredVideoEnabled = false;

    stream?.getVideoTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });

    this.stateStore.notifyVideoAvailability(false, reason);
  }

  async startAudioTrack(): Promise<MediaStreamTrack | null> {
    const stream = this.getStream();
    if (!stream) return null;

    this.preferredAudioEnabled = true;

    const existing = stream.getAudioTracks()[0];
    if (existing && existing.readyState !== 'ended') {
      existing.enabled = true;
      this.stateStore.notifyAudioAvailability(true);
      return existing;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: this.buildAudioConstraints(this.selectedAudioDeviceId)
      });
      const track = newStream.getAudioTracks()[0];
      if (!track) {
        newStream.getTracks().forEach(t => t.stop());
        return null;
      }
      this.selectedAudioDeviceId = track.getSettings().deviceId ?? null;
      stream.addTrack(track);
      this.stateStore.notifyAudioAvailability(true);
      newStream.getVideoTracks().forEach(t => t.stop());
      return track;
    } catch (err) {
      this.stateStore.notifyAudioAvailability(false, err instanceof Error ? err.message : 'Failed to access microphone');
      return null;
    }
  }

  stopAudioTrack(reason = 'Microphone turned off'): void {
    const stream = this.getStream();
    this.preferredAudioEnabled = false;

    stream?.getAudioTracks().forEach(track => {
      track.stop();
      stream.removeTrack(track);
    });

    this.stateStore.notifyAudioAvailability(false, reason);
  }

  hasVideoTrack(): boolean {
    return this.getStream()?.getVideoTracks().length > 0;
  }

  hasAudioTrack(): boolean {
    return this.getStream()?.getAudioTracks().length > 0;
  }

  isVideoEnabled(): boolean {
    const track = this.getStream()?.getVideoTracks()[0];
    return track?.enabled ?? false;
  }

  isAudioEnabled(): boolean {
    const track = this.getStream()?.getAudioTracks()[0];
    return track?.enabled ?? false;
  }

  isPreferredVideoEnabled(): boolean {
    return this.preferredVideoEnabled;
  }

  isPreferredAudioEnabled(): boolean {
    return this.preferredAudioEnabled;
  }

  setPreferredVideoEnabled(enabled: boolean): void {
    this.preferredVideoEnabled = enabled;
  }

  setPreferredAudioEnabled(enabled: boolean): void {
    this.preferredAudioEnabled = enabled;
  }

  private buildVideoConstraints(deviceId: string | null): boolean | MediaTrackConstraints {
    if (deviceId) {
      return { deviceId: { exact: deviceId } };
    }
    return { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
  }

  private buildAudioConstraints(deviceId: string | null): boolean | MediaTrackConstraints {
    if (deviceId) {
      return { deviceId: { exact: deviceId } };
    }
    return { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  }
}
```

#### Step 2.2.4: Refactor Manager as Facade

`apps/client/src/lib/media/manager.ts` (refactored):

```typescript
import { MediaStateStore } from './state-store';
import { MediaAcquisition, PermissionDeniedStrategy, DeviceNotFoundStrategy } from './acquisition';
import { MediaTrackController } from './track-controller';
import type { IMediaManager } from './interfaces';
import type { UserMediaConstraints, MediaDeviceInfo, MediaPermissionStatus } from './types';

export class MediaStreamManager implements IMediaManager {
  private stateStore = new MediaStateStore();
  private acquisition = new MediaAcquisition(this.stateStore, [
    new PermissionDeniedStrategy(),
    new DeviceNotFoundStrategy(),
  ]);
  private trackController = new MediaTrackController(
    () => this.acquisition.getStream(),
    this.stateStore
  );

  // IMediaAcquisition
  async startStream(constraints?: UserMediaConstraints): Promise<MediaStream> {
    return this.acquisition.start(constraints);
  }

  stopStream(): void {
    this.acquisition.stop();
  }

  getStream(): MediaStream | null {
    return this.acquisition.getStream();
  }

  // IMediaTrackController
  async startVideoTrack(): Promise<MediaStreamTrack | null> {
    return this.trackController.startVideoTrack();
  }

  stopVideoTrack(reason?: string): void {
    this.trackController.stopVideoTrack(reason);
  }

  async startAudioTrack(): Promise<MediaStreamTrack | null> {
    return this.trackController.startAudioTrack();
  }

  stopAudioTrack(reason?: string): void {
    this.trackController.stopAudioTrack(reason);
  }

  hasVideoTrack(): boolean {
    return this.trackController.hasVideoTrack();
  }

  hasAudioTrack(): boolean {
    return this.trackController.hasAudioTrack();
  }

  isVideoEnabled(): boolean {
    return this.trackController.isVideoEnabled();
  }

  isAudioEnabled(): boolean {
    return this.trackController.isAudioEnabled();
  }

  isPreferredVideoEnabled(): boolean {
    return this.trackController.isPreferredVideoEnabled();
  }

  isPreferredAudioEnabled(): boolean {
    return this.trackController.isPreferredAudioEnabled();
  }

  setPreferredVideoEnabled(enabled: boolean): void {
    this.trackController.setPreferredVideoEnabled(enabled);
  }

  setPreferredAudioEnabled(enabled: boolean): void {
    this.trackController.setPreferredAudioEnabled(enabled);
  }

  // IMediaDeviceSelector
  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(d => d.kind === 'videoinput' || d.kind === 'audioinput')
      .map(d => ({ deviceId: d.deviceId, kind: d.kind as 'videoinput' | 'audioinput', label: d.label }));
  }

  async switchVideoDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    return this.trackController.switchVideoDevice(deviceId);
  }

  async switchAudioDevice(deviceId: string): Promise<MediaStreamTrack | null> {
    return this.trackController.switchAudioDevice(deviceId);
  }

  getVideoDeviceId(): string | null {
    return this.trackController.getVideoDeviceId();
  }

  getAudioDeviceId(): string | null {
    return this.trackController.getAudioDeviceId();
  }

  setSelectedVideoDeviceId(deviceId: string | null): void {
    this.trackController.setSelectedVideoDeviceId(deviceId);
  }

  setSelectedAudioDeviceId(deviceId: string | null): void {
    this.trackController.setSelectedAudioDeviceId(deviceId);
  }

  // IMediaPermissionChecker
  async checkPermissions(): Promise<MediaPermissionStatus> {
    // Move existing implementation
  }

  // IMediaStateNotifier
  getStatus() { return this.stateStore.getStatus(); }
  onStatusChange(cb) { return this.stateStore.onStatusChange(cb); }
  onVideoAvailabilityChange(cb) { return this.stateStore.onVideoAvailabilityChange(cb); }
  onAudioAvailabilityChange(cb) { return this.stateStore.onAudioAvailabilityChange(cb); }
}

export const mediaManager = new MediaStreamManager();
```

---

## Phase 3: Split SfuManager

**Goal:** Break the 817-line god object into focused classes.

### 3.1 New File Structure

```
lib/sfu/
├── types.ts              # Existing types
├── interfaces.ts         # Contracts (new)
├── quality-score.ts      # Pure scoring function (new)
├── connection.ts         # Socket lifecycle (new)
├── room-membership.ts    # Join/leave/kick (new)
├── transport-manager.ts  # Device + transports (new, internal)
├── producer-manager.ts   # Producer lifecycle (new)
├── consumer-manager.ts   # Consumer lifecycle (new, internal)
├── peer-registry.ts      # Peer tracking (new)
├── stats-collector.ts    # Stats polling (new)
├── event-router.ts       # Socket event → handler routing (new)
└── manager.ts            # Facade (refactored)
```

### 3.2 Implementation Steps

#### Step 3.2.1: Extract Connection

`apps/client/src/lib/sfu/connection.ts`:

```typescript
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env as { VITE_SOCKET_URL?: string }).VITE_SOCKET_URL ?? 'http://localhost:3000';

export class SfuConnection {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(`${SOCKET_URL}/sfu`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}
```

#### Step 3.2.2: Extract Event Router

`apps/client/src/lib/sfu/event-router.ts`:

```typescript
import type { Socket } from 'socket.io-client';
import type { SfuJoinedPayload, SfuTransportCreatedPayload, SfuNewProducerPayload } from './types';

export interface SfuEventHandlers {
  onConnected(): void;
  onDisconnected(): void;
  onJoined(payload: SfuJoinedPayload): Promise<void>;
  onTransportCreated(payload: SfuTransportCreatedPayload): Promise<void>;
  onNewProducer(payload: SfuNewProducerPayload): Promise<void>;
  // ... other events
}

export class SfuEventRouter {
  constructor(
    private getSocket: () => Socket | null,
    private handlers: SfuEventHandlers
  ) {}

  setup(): void {
    const socket = this.getSocket();
    if (!socket) return;

    socket.on('connect', () => this.handlers.onConnected());
    socket.on('disconnect', () => this.handlers.onDisconnected());
    socket.on('sfu:joined', (p) => this.handlers.onJoined(p));
    socket.on('sfu:transport-created', (p) => this.handlers.onTransportCreated(p));
    socket.on('sfu:new-producer', (p) => this.handlers.onNewProducer(p));
    // ... other events
  }

  teardown(): void {
    const socket = this.getSocket();
    if (!socket) return;

    socket.removeAllListeners();
  }
}
```

#### Step 3.2.3: Extract Stats Collector

`apps/client/src/lib/sfu/stats-collector.ts`:

```typescript
import type { Consumer, Transport } from 'mediasoup-client/types';
import type { QualityStatsCallback, PeerQualityStats, QualityStats } from './types';
import { calculateQualityScore } from './quality-score';

export class SfuStatsCollector {
  private interval: ReturnType<typeof setInterval> | null = null;
  private callbacks = new Set<QualityStatsCallback>();

  constructor(
    private getRecvTransport: () => Transport | null,
    private getConsumers: () => Iterable<[string, Consumer]>,
    private getPeerForProducer: (producerId: string) => string | undefined
  ) {}

  start(intervalMs = 2000): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.collect(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  onStats(callback: QualityStatsCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private async collect(): Promise<void> {
    const recvTransport = this.getRecvTransport();
    if (!recvTransport) return;

    const statsMap = new Map<string, PeerQualityStats>();

    for (const [consumerId, consumer] of this.getConsumers()) {
      try {
        const stats = await this.getConsumerStats(recvTransport, consumer);
        if (!stats) continue;

        const userId = this.getPeerForProducer(consumer.producerId);
        if (!userId) continue;

        statsMap.set(userId, { userId, stats, score: calculateQualityScore(stats) });
      } catch {
        // Log and continue
      }
    }

    if (statsMap.size > 0) {
      this.callbacks.forEach(cb => cb(statsMap));
    }
  }

  private async getConsumerStats(transport: Transport, consumer: Consumer): Promise<QualityStats | null> {
    // Move existing implementation
  }
}
```

#### Step 3.2.4: Refactor Manager as Facade

`apps/client/src/lib/sfu/manager.ts` (refactored):

```typescript
import { Device } from 'mediasoup-client';
import { SfuConnection } from './connection';
import { SfuEventRouter, type SfuEventHandlers } from './event-router';
import { SfuStatsCollector } from './stats-collector';
import type { ISfuManager } from './interfaces';
import type { SfuState, SfuJoinedPayload, SfuTransportCreatedPayload, SfuNewProducerPayload, SfuJoinPayload, SfuKickedPayload, SfuPeerInfo, QualityStatsCallback, PeerQualityStats } from './types';

export class SfuManager implements ISfuManager {
  private connection = new SfuConnection();
  private statsCollector = new SfuStatsCollector(
    () => this.recvTransport,
    () => this.consumers.entries(),
    (producerId) => this.findPeerForProducer(producerId)
  );

  // Internal mediasoup state
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private peers = new Map<string, SfuPeerInfo>();

  // Event router with private handlers (not exposed on public interface)
  private eventRouter = new SfuEventRouter(
    () => this.connection.getSocket(),
    {
      onConnected: () => this.handleConnected(),
      onDisconnected: () => this.handleDisconnected(),
      onJoined: (p) => this.handleJoined(p),
      onTransportCreated: (p) => this.handleTransportCreated(p),
      onNewProducer: (p) => this.handleNewProducer(p),
    }
  );

  private state: SfuState = { connectionState: 'disconnected' };
  private stateCallbacks = new Set<(state: SfuState) => void>();
  private trackCallbacks = new Set<SfuTrackCallback>();
  private peerJoinedCallbacks = new Set<SfuPeerCallback>();
  private peerLeftCallbacks = new Set<(userId: string) => void>();
  private kickedCallbacks = new Set<(payload: SfuKickedPayload) => void>();

  // ISfuConnection
  connect(): void {
    this.connection.connect();
    this.eventRouter.setup();
  }

  disconnect(): void {
    this.statsCollector.stop();
    this.eventRouter.teardown();
    this.closeAll();
    this.connection.disconnect();
  }

  isConnected(): boolean {
    return this.connection.isConnected();
  }

  getSocket() {
    return this.connection.getSocket();
  }

  // Private event handlers (not on public interface)
  private handleConnected(): void {
    this.updateState({ connectionState: 'connected' });
  }

  private handleDisconnected(): void {
    this.closeAll();
    this.updateState({ connectionState: 'disconnected' });
  }

  private async handleJoined(payload: SfuJoinedPayload): Promise<void> {
    // Move existing implementation
  }

  private async handleTransportCreated(payload: SfuTransportCreatedPayload): Promise<void> {
    // Move existing implementation
  }

  private async handleNewProducer(payload: SfuNewProducerPayload): Promise<void> {
    // Move existing implementation
  }

  private findPeerForProducer(producerId: string): string | undefined {
    for (const [userId, peer] of this.peers) {
      if (peer.producers.has(producerId)) {
        return userId;
      }
    }
    return undefined;
  }

  // ISfuRoomMembership
  async joinRoom(payload: SfuJoinPayload): Promise<void> {
    const socket = this.connection.getSocket();
    if (!socket) return;
    socket.emit('sfu:join', payload);
  }

  leaveRoom(): void {
    const socket = this.connection.getSocket();
    if (socket) {
      socket.emit('sfu:leave');
    }
    this.closeAll();
  }

  kickPeer(userId: string): boolean {
    const socket = this.connection.getSocket();
    if (!socket) return false;
    socket.emit('sfu:kick-peer', { userId });
    return true;
  }

  onKicked(callback: (payload: SfuKickedPayload) => void): () => void {
    this.kickedCallbacks.add(callback);
    return () => this.kickedCallbacks.delete(callback);
  }

  // ISfuProducerManager
  async produce(track: MediaStreamTrack): Promise<Producer | null> {
    // Move existing implementation
  }

  pauseProducer(producerId: string): void {
    // Move existing implementation
  }

  resumeProducer(producerId: string): void {
    // Move existing implementation
  }

  closeProducer(kind: 'audio' | 'video'): void {
    // Move existing implementation
  }

  async replaceTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<boolean> {
    // Move existing implementation
  }

  getProducerByKind(kind: 'audio' | 'video'): Producer | undefined {
    // Move existing implementation
  }

  // ISfuPeerRegistry
  getPeers(): Map<string, SfuPeerInfo> {
    return new Map(this.peers);
  }

  getPeer(userId: string): SfuPeerInfo | undefined {
    return this.peers.get(userId);
  }

  onPeerJoined(callback: SfuPeerCallback): () => void {
    this.peerJoinedCallbacks.add(callback);
    return () => this.peerJoinedCallbacks.delete(callback);
  }

  onPeerLeft(callback: (userId: string) => void): () => void {
    this.peerLeftCallbacks.add(callback);
    return () => this.peerLeftCallbacks.delete(callback);
  }

  // ISfuStateNotifier
  getState(): SfuState {
    return { ...this.state };
  }

  onStateChange(callback: (state: SfuState) => void): () => void {
    this.stateCallbacks.add(callback);
    callback(this.getState());
    return () => this.stateCallbacks.delete(callback);
  }

  onTrack(callback: SfuTrackCallback): () => void {
    this.trackCallbacks.add(callback);
    return () => this.trackCallbacks.delete(callback);
  }

  // Stats pass-through
  startStatsCollection(intervalMs?: number): void {
    this.statsCollector.start(intervalMs);
  }

  stopStatsCollection(): void {
    this.statsCollector.stop();
  }

  onQualityStats(callback: QualityStatsCallback): () => void {
    return this.statsCollector.onStats(callback);
  }

  getStats(): Map<string, PeerQualityStats> {
    // Move existing implementation or delegate
  }

  // Private helpers
  private closeAll(): void {
    // Move existing implementation
  }

  private updateState(partial: Partial<SfuState>): void {
    this.state = { ...this.state, ...partial };
    this.stateCallbacks.forEach(cb => cb(this.getState()));
  }
}

export const sfuManager = new SfuManager();
```

---

## Phase 4: Introduce Dependency Injection

**Goal:** Remove direct singleton imports from React modules.

### 4.1 Create React Context for Media

`apps/client/src/features/media/contexts/media-manager.context.tsx`:

```typescript
import { createContext, useContext } from 'react';
import type { IMediaManager } from '@/lib/media/interfaces';

const MediaManagerContext = createContext<IMediaManager | null>(null);

export function MediaManagerProvider({ 
  manager, 
  children 
}: { 
  manager: IMediaManager; 
  children: React.ReactNode;
}) {
  return (
    <MediaManagerContext.Provider value={manager}>
      {children}
    </MediaManagerContext.Provider>
  );
}

export function useMediaManager(): IMediaManager {
  const manager = useContext(MediaManagerContext);
  if (!manager) {
    throw new Error('useMediaManager must be used within MediaManagerProvider');
  }
  return manager;
}
```

### 4.2 Create React Context for SFU

`apps/client/src/features/sfu/contexts/sfu-manager.context.tsx`:

```typescript
import { createContext, useContext } from 'react';
import type { ISfuManager } from '@/lib/sfu/interfaces';

const SfuManagerContext = createContext<ISfuManager | null>(null);

export function SfuManagerProvider({ 
  manager, 
  children 
}: { 
  manager: ISfuManager; 
  children: React.ReactNode;
}) {
  return (
    <SfuManagerContext.Provider value={manager}>
      {children}
    </SfuManagerContext.Provider>
  );
}

export function useSfuManager(): ISfuManager {
  const manager = useContext(SfuManagerContext);
  if (!manager) {
    throw new Error('useSfuManager must be used within SfuManagerProvider');
  }
  return manager;
}
```

### 4.3 Update Hooks to Use DI

`apps/client/src/features/media/hooks/use-media-controls.ts` (refactored):

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useMediaManager } from '../contexts/media-manager.context';

export interface MediaControlsState {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export interface UseMediaControlsReturn {
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isVideoAvailable: boolean;
  isAudioAvailable: boolean;
  enableVideo: () => Promise<void>;
  disableVideo: () => void;
  enableAudio: () => Promise<void>;
  disableAudio: () => void;
  toggleVideo: () => Promise<void>;
  toggleAudio: () => Promise<void>;
}

export function useMediaControls(initialState?: Partial<MediaControlsState>): UseMediaControlsReturn {
  const manager = useMediaManager();
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(
    initialState?.isVideoEnabled ?? manager.isPreferredVideoEnabled()
  );
  const [isAudioEnabled, setIsAudioEnabled] = useState(
    initialState?.isAudioEnabled ?? manager.isPreferredAudioEnabled()
  );
  const [isVideoAvailable, setIsVideoAvailable] = useState(false);
  const [isAudioAvailable, setIsAudioAvailable] = useState(false);

  useEffect(() => {
    const unsubStatus = manager.onStatusChange((status) => {
      // Handle status changes if needed
    });
    const unsubVideo = manager.onVideoAvailabilityChange((available) => {
      setIsVideoAvailable(available);
    });
    const unsubAudio = manager.onAudioAvailabilityChange((available) => {
      setIsAudioAvailable(available);
    });

    return () => {
      unsubStatus();
      unsubVideo();
      unsubAudio();
    };
  }, [manager]);

  // BUG FIX: These actually start/stop tracks (not just preference)
  const enableVideo = useCallback(async () => {
    const track = await manager.startVideoTrack();
    if (track) {
      setIsVideoEnabled(true);
      setIsVideoAvailable(true);
    }
  }, [manager]);

  const disableVideo = useCallback(() => {
    manager.stopVideoTrack();
    setIsVideoEnabled(false);
    setIsVideoAvailable(false);
  }, [manager]);

  const enableAudio = useCallback(async () => {
    const track = await manager.startAudioTrack();
    if (track) {
      setIsAudioEnabled(true);
      setIsAudioAvailable(true);
    }
  }, [manager]);

  const disableAudio = useCallback(() => {
    manager.stopAudioTrack();
    setIsAudioEnabled(false);
    setIsAudioAvailable(false);
  }, [manager]);

  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled) {
      disableVideo();
    } else {
      await enableVideo();
    }
  }, [isVideoEnabled, enableVideo, disableVideo]);

  const toggleAudio = useCallback(async () => {
    if (isAudioEnabled) {
      disableAudio();
    } else {
      await enableAudio();
    }
  }, [isAudioEnabled, enableAudio, disableAudio]);

  return {
    isVideoEnabled,
    isAudioEnabled,
    isVideoAvailable,
    isAudioAvailable,
    enableVideo,
    disableVideo,
    enableAudio,
    disableAudio,
    toggleVideo,
    toggleAudio,
  };
}
```

### 4.4 App-Level Provider Setup

`apps/client/src/app/providers.tsx` (or equivalent):

```typescript
import { MediaManagerProvider } from '@/features/media/contexts/media-manager.context';
import { SfuManagerProvider } from '@/features/sfu/contexts/sfu-manager.context';
import { mediaManager } from '@/lib/media/manager';
import { sfuManager } from '@/lib/sfu/manager';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MediaManagerProvider manager={mediaManager}>
      <SfuManagerProvider manager={sfuManager}>
        {children}
      </SfuManagerProvider>
    </MediaManagerProvider>
  );
}
```

### 4.5 Fix `useRoomSfu` / `useMediasoup` Double-Produce Race Condition

**Problem:** `useRoomSfu.toggleVideo` and `toggleAudio` currently call `sfuManager.produce()` directly, bypassing `useMediasoup`'s `producedKindsRef`. This causes duplicate producers on remount.

**Solution:** `useRoomSfu` must call `produceTrack` (the callback from `useMediasoup`) instead of `sfuManager.produce()` directly.

`apps/client/src/features/room/hooks/use-room-sfu.ts` (refactored):

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useMediasoup } from '@/hooks/use-mediasoup';
import { useMediaControls } from '@/features/media/hooks/use-media-controls';
import { useMediaManager } from '@/features/media/contexts/media-manager.context';
import type { SfuState } from '@/lib/sfu/types';

export interface UseRoomSfuOptions {
  roomId: string;
  enabled?: boolean;
}

export interface UseRoomSfuResult {
  // ... existing fields
  toggleVideo: () => Promise<boolean>;
  toggleAudio: () => Promise<boolean>;
}

export function useRoomSfu({ roomId, enabled = true }: UseRoomSfuOptions): UseRoomSfuResult {
  const mediaManager = useMediaManager();
  const mediaControls = useMediaControls();
  
  const { 
    produceTrack,  // <-- Use this instead of sfuManager.produce()
    replaceTrack, 
    state: sfuState,
    // ... other fields
  } = useMediasoup({ roomId, enabled });

  const toggleVideo = useCallback(async (): Promise<boolean> => {
    const currentlyEnabled = mediaControls.isVideoEnabled;

    if (currentlyEnabled) {
      mediaManager.stopVideoTrack();
      mediaControls.disableVideo();
      return true;
    }

    const track = await mediaManager.startVideoTrack();
    if (!track) return false;

    // FIX: Use produceTrack from useMediasoup, not sfuManager.produce()
    const existingProducer = sfuManager.getProducerByKind('video');
    if (existingProducer) {
      return replaceTrack('video', track);
    } else {
      const producer = await produceTrack(track);
      return producer !== null;
    }
  }, [mediaManager, mediaControls, produceTrack, replaceTrack, sfuState]);

  const toggleAudio = useCallback(async (): Promise<boolean> => {
    // Same pattern as toggleVideo
  }, [mediaManager, mediaControls, produceTrack, replaceTrack, sfuState]);

  // ... rest of implementation
}
```

---

## Phase 5: Fix Component Dependencies

**Goal:** Remove direct manager imports from UI components.

### 5.1 Update DeviceSelector

`apps/client/src/features/media/components/device-selector.tsx` (refactored):

```typescript
import { useMediaControls } from '../hooks/use-media-controls';
import { useMediaStreamContext } from '../contexts/media-stream.context';
import { DeviceSettingsPanel } from './device-settings-panel';
import { Button } from '@/components/ui/button';
import { LocalVideo } from '@/components/local-video';
import { cn } from '@/lib/utils';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

export interface DeviceSelectorProps {
  className?: string;
}

export function DeviceSelector({ className }: DeviceSelectorProps) {
  const { stream, error, isLoading } = useMediaStreamContext();
  const { 
    isVideoEnabled, 
    isAudioEnabled, 
    toggleVideo, 
    toggleAudio 
  } = useMediaControls();

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        <LocalVideo stream={stream} className="size-full object-cover" />

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleVideo}
            disabled={!stream || !!error}
          >
            {isVideoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={toggleAudio}
            disabled={!stream || !!error}
          >
            {isAudioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </Button>
        </div>
      </div>

      <DeviceSettingsPanel
        variant="inline"
        isVideoEnabled={isVideoEnabled}
        isAudioEnabled={isAudioEnabled}
      />
    </div>
  );
}
```

---

## Phase 6: Testing Strategy

### 6.1 Unit Test Mocks

With interfaces in place, create test utilities:

`apps/client/src/lib/media/__mocks__/mock-media-manager.ts`:

```typescript
import { vi } from 'vitest';
import type { IMediaManager } from '../interfaces';

export function createMockMediaManager(overrides?: Partial<IMediaManager>): IMediaManager {
  return {
    startStream: vi.fn(),
    stopStream: vi.fn(),
    getStream: vi.fn(() => null),
    startVideoTrack: vi.fn(),
    stopVideoTrack: vi.fn(),
    startAudioTrack: vi.fn(),
    stopAudioTrack: vi.fn(),
    hasVideoTrack: vi.fn(() => false),
    hasAudioTrack: vi.fn(() => false),
    isVideoEnabled: vi.fn(() => false),
    isAudioEnabled: vi.fn(() => false),
    isPreferredVideoEnabled: vi.fn(() => true),
    isPreferredAudioEnabled: vi.fn(() => true),
    setPreferredVideoEnabled: vi.fn(),
    setPreferredAudioEnabled: vi.fn(),
    enumerateDevices: vi.fn(() => []),
    switchVideoDevice: vi.fn(),
    switchAudioDevice: vi.fn(),
    getVideoDeviceId: vi.fn(() => null),
    getAudioDeviceId: vi.fn(() => null),
    setSelectedVideoDeviceId: vi.fn(),
    setSelectedAudioDeviceId: vi.fn(),
    checkPermissions: vi.fn(),
    getStatus: vi.fn(() => 'idle'),
    onStatusChange: vi.fn(() => () => {}),
    onVideoAvailabilityChange: vi.fn(() => () => {}),
    onAudioAvailabilityChange: vi.fn(() => () => {}),
    ...overrides,
  };
}
```

`apps/client/src/lib/sfu/__mocks__/mock-sfu-manager.ts`:

```typescript
import { vi } from 'vitest';
import type { ISfuManager } from '../interfaces';

export function createMockSfuManager(overrides?: Partial<ISfuManager>): ISfuManager {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isConnected: vi.fn(() => false),
    getSocket: vi.fn(() => null),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    kickPeer: vi.fn(() => false),
    onKicked: vi.fn(() => () => {}),
    produce: vi.fn(),
    pauseProducer: vi.fn(),
    resumeProducer: vi.fn(),
    closeProducer: vi.fn(),
    replaceTrack: vi.fn(async () => false),
    getProducerByKind: vi.fn(() => undefined),
    getPeers: vi.fn(() => new Map()),
    getPeer: vi.fn(() => undefined),
    onPeerJoined: vi.fn(() => () => {}),
    onPeerLeft: vi.fn(() => () => {}),
    getState: vi.fn(() => ({ connectionState: 'disconnected' })),
    onStateChange: vi.fn(() => () => {}),
    onTrack: vi.fn(() => () => {}),
    ...overrides,
  };
}
```

### 6.2 Test Hook Isolation

```typescript
// use-media-controls.test.ts
import { renderHook, act } from '@testing-library/react';
import { MediaManagerProvider } from '../contexts/media-manager.context';
import { useMediaControls } from '../hooks/use-media-controls';
import { createMockMediaManager } from '@/lib/media/__mocks__/mock-media-manager';

test('toggleVideo calls manager.startVideoTrack when disabled', async () => {
  const manager = createMockMediaManager({
    isVideoEnabled: () => false,
    startVideoTrack: vi.fn(async () => ({ id: 'track-1' } as MediaStreamTrack)),
  });

  const { result } = renderHook(() => useMediaControls(), {
    wrapper: ({ children }) => (
      <MediaManagerProvider manager={manager}>{children}</MediaManagerProvider>
    ),
  });

  await act(() => result.current.enableVideo());
  expect(manager.startVideoTrack).toHaveBeenCalled();
});
```

---

## Migration Order & Risk Assessment

| Phase | Risk | Effort | Dependencies |
|-------|------|--------|--------------|
| 1. Extract Interfaces | Low | 2h | None |
| 2. Split MediaStreamManager | Medium | 8h | Phase 1 |
| 3. Split SfuManager | Medium | 8h | Phase 1 |
| 4. Introduce DI | Medium | 4h | Phase 1-3 |
| 5. Fix Components | Low | 2h | Phase 4 |
| 6. Testing | Low | 4h | Phase 4 |

**Recommended execution:**
1. Start with Phase 1 (interfaces) — zero runtime impact, pure additions
2. Run Phase 2 and 3 in parallel if team size permits
3. Phase 4-5 together after managers are stable
4. Add tests incrementally throughout

---

## Success Criteria

- [ ] `MediaStreamManager` < 150 lines (facade only)
- [ ] `SfuManager` < 200 lines (facade only)
- [ ] No direct `mediaManager`/`sfuManager` imports in `features/**`
- [ ] All components access managers via hooks/contexts
- [ ] `useMediaControls` exposes `enableVideo`/`disableVideo`/`toggleVideo` commands that actually start/stop tracks
- [ ] `useRoomSfu` uses `produceTrack` from `useMediasoup` (fixes double-produce bug)
- [ ] Unit tests can mock managers via interfaces
- [ ] Existing e2e tests pass unchanged

---

## Appendix: Files to Create/Modify Summary

### New Files
- `lib/media/types.ts`
- `lib/media/interfaces.ts`
- `lib/media/state-store.ts`
- `lib/media/acquisition.ts`
- `lib/media/track-controller.ts`
- `lib/media/device-selector.ts`
- `lib/media/permissions.ts`
- `lib/sfu/interfaces.ts`
- `lib/sfu/quality-score.ts`
- `lib/sfu/connection.ts`
- `lib/sfu/room-membership.ts`
- `lib/sfu/transport-manager.ts`
- `lib/sfu/producer-manager.ts`
- `lib/sfu/consumer-manager.ts`
- `lib/sfu/peer-registry.ts`
- `lib/sfu/stats-collector.ts`
- `lib/sfu/event-router.ts`
- `features/media/contexts/media-manager.context.tsx`
- `features/sfu/contexts/sfu-manager.context.tsx`
- `lib/media/__mocks__/mock-media-manager.ts`
- `lib/sfu/__mocks__/mock-sfu-manager.ts`

### Modified Files
- `lib/media/manager.ts` — refactor to facade
- `lib/sfu/manager.ts` — refactor to facade
- `features/media/hooks/use-media-controls.ts` — use DI, fix track control methods
- `features/media/hooks/use-device-switching.ts` — use DI
- `features/media/contexts/media-stream.context.tsx` — use DI
- `features/room/hooks/use-room-sfu.ts` — use DI, fix double-produce via produceTrack
- `hooks/use-mediasoup.ts` — use DI
- `features/media/components/device-selector.tsx` — remove direct manager import
