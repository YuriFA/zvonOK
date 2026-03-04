import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebRTCManager } from '../manager';

// Mock RTCPeerConnection as a class
const mockReplaceTrack = vi.fn();
const mockClose = vi.fn();

class MockRTCPeerConnection {
  connectionState = 'new';
  iceConnectionState = 'new';
  remoteDescription: RTCSessionDescription | null = null;
  onicecandidate: ((event: Event) => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;

  private _senders: RTCRtpSender[] = [];

  addTrack(track: MediaStreamTrack, _stream: MediaStream): RTCRtpSender {
    const sender = {
      track,
      replaceTrack: mockReplaceTrack,
    } as unknown as RTCRtpSender;
    this._senders.push(sender);
    return sender;
  }

  getSenders(): RTCRtpSender[] {
    return this._senders;
  }

  close = mockClose;
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: '' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: '' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  addIceCandidate = vi.fn().mockResolvedValue(undefined);
}

vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection);

const createMockTrack = (id: string, kind: 'video' | 'audio') => ({
  id,
  kind,
  enabled: true,
  stop: vi.fn(),
});

const createMockStream = (videoTracks: MediaStreamTrack[] = [], audioTracks: MediaStreamTrack[] = []) => ({
  id: 'stream-1',
  getVideoTracks: () => videoTracks,
  getAudioTracks: () => audioTracks,
  getTracks: () => [...videoTracks, ...audioTracks],
});

describe('WebRTCManager', () => {
  let manager: WebRTCManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WebRTCManager();
  });

  afterEach(() => {
    manager.closeAll();
  });

  describe('initial state', () => {
    it('should have no peer connections initially', () => {
      expect(manager.getPeerIds()).toEqual([]);
    });

    it('should return null for local stream initially', () => {
      expect(manager.getLocalStream()).toBeNull();
    });

    it('should return undefined for non-existent peer connection', () => {
      expect(manager.getPeerConnection('non-existent')).toBeUndefined();
    });

    it('should return undefined for non-existent remote stream', () => {
      expect(manager.getRemoteStream('non-existent')).toBeUndefined();
    });
  });

  describe('setLocalStream', () => {
    it('should store the local stream', () => {
      const stream = createMockStream() as unknown as MediaStream;
      manager.setLocalStream(stream);

      expect(manager.getLocalStream()).toBe(stream);
    });
  });

  describe('createPeerConnection', () => {
    it('should create a new peer connection', () => {
      manager.createPeerConnection('peer-1');

      expect(manager.hasPeerConnection('peer-1')).toBe(true);
    });

    it('should return existing peer connection if already exists', () => {
      const pc1 = manager.createPeerConnection('peer-1');
      const pc2 = manager.createPeerConnection('peer-1');

      expect(pc1).toBe(pc2);
    });

    it('should add local tracks to new peer connection', () => {
      const videoTrack = createMockTrack('video-1', 'video') as unknown as MediaStreamTrack;
      const audioTrack = createMockTrack('audio-1', 'audio') as unknown as MediaStreamTrack;
      const stream = createMockStream([videoTrack], [audioTrack]) as unknown as MediaStream;

      manager.setLocalStream(stream);
      const pc = manager.createPeerConnection('peer-1');

      // Check that senders were added (2 tracks = 2 senders)
      expect(pc.getSenders()).toHaveLength(2);
    });
  });

  describe('closePeerConnection', () => {
    it('should remove peer connection', () => {
      manager.createPeerConnection('peer-1');
      manager.closePeerConnection('peer-1');

      expect(manager.hasPeerConnection('peer-1')).toBe(false);
    });
  });

  describe('closeAll', () => {
    it('should close all peer connections', () => {
      manager.createPeerConnection('peer-1');
      manager.createPeerConnection('peer-2');
      manager.closeAll();

      expect(manager.getPeerIds()).toEqual([]);
    });
  });

  describe('replaceTrack', () => {
    it('should return true when no peer connections exist', async () => {
      const newTrack = createMockTrack('new-video', 'video') as unknown as MediaStreamTrack;
      const result = await manager.replaceTrack('video', newTrack);

      expect(result).toBe(true);
    });

    it('should replace video track in all peer connections', async () => {
      const videoTrack = createMockTrack('video-1', 'video') as unknown as MediaStreamTrack;
      const stream = createMockStream([videoTrack], []) as unknown as MediaStream;

      manager.setLocalStream(stream);
      manager.createPeerConnection('peer-1');

      const newTrack = createMockTrack('new-video', 'video') as unknown as MediaStreamTrack;
      mockReplaceTrack.mockResolvedValueOnce(undefined);

      const result = await manager.replaceTrack('video', newTrack);

      expect(mockReplaceTrack).toHaveBeenCalledWith(newTrack);
      expect(result).toBe(true);
    });

    it('should replace audio track in all peer connections', async () => {
      const audioTrack = createMockTrack('audio-1', 'audio') as unknown as MediaStreamTrack;
      const stream = createMockStream([], [audioTrack]) as unknown as MediaStream;

      manager.setLocalStream(stream);
      manager.createPeerConnection('peer-1');

      const newTrack = createMockTrack('new-audio', 'audio') as unknown as MediaStreamTrack;
      mockReplaceTrack.mockResolvedValueOnce(undefined);

      const result = await manager.replaceTrack('audio', newTrack);

      expect(mockReplaceTrack).toHaveBeenCalledWith(newTrack);
      expect(result).toBe(true);
    });

    it('should return false when replaceTrack fails for some peers', async () => {
      const videoTrack = createMockTrack('video-1', 'video') as unknown as MediaStreamTrack;
      const stream = createMockStream([videoTrack], []) as unknown as MediaStream;

      manager.setLocalStream(stream);
      manager.createPeerConnection('peer-1');

      const newTrack = createMockTrack('new-video', 'video') as unknown as MediaStreamTrack;
      mockReplaceTrack.mockRejectedValueOnce(new Error('Failed to replace'));

      const result = await manager.replaceTrack('video', newTrack);

      expect(result).toBe(false);
    });

    it('should handle peer connection with no sender for track kind', async () => {
      // Create connection without adding local stream (no tracks)
      manager.createPeerConnection('peer-1');

      const newTrack = createMockTrack('new-video', 'video') as unknown as MediaStreamTrack;

      const result = await manager.replaceTrack('video', newTrack);

      expect(mockReplaceTrack).not.toHaveBeenCalled();
      expect(result).toBe(true); // No sender to fail on
    });
  });

  describe('getVideoTrack', () => {
    it('should return null when no local stream exists', () => {
      expect(manager.getVideoTrack()).toBeNull();
    });

    it('should return video track from local stream', () => {
      const videoTrack = createMockTrack('video-1', 'video') as unknown as MediaStreamTrack;
      const stream = createMockStream([videoTrack], []) as unknown as MediaStream;

      manager.setLocalStream(stream);

      expect(manager.getVideoTrack()).toBe(videoTrack);
    });
  });

  describe('getAudioTrack', () => {
    it('should return null when no local stream exists', () => {
      expect(manager.getAudioTrack()).toBeNull();
    });

    it('should return audio track from local stream', () => {
      const audioTrack = createMockTrack('audio-1', 'audio') as unknown as MediaStreamTrack;
      const stream = createMockStream([], [audioTrack]) as unknown as MediaStream;

      manager.setLocalStream(stream);

      expect(manager.getAudioTrack()).toBe(audioTrack);
    });
  });

  describe('event subscriptions', () => {
    it('should return unsubscribe function for onRemoteStream', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onRemoteStream(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function for onIceCandidate', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onIceCandidate(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function for onPeerStateChange', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onPeerStateChange(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function for onOffer', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onOffer(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function for onAnswer', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onAnswer(callback);

      expect(typeof unsubscribe).toBe('function');
    });
  });
});
