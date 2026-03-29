import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRemoteAudioMixer } from '../remote-audio-mixer';

const mockTrack = (id: string) =>
  ({ id, kind: 'audio', stop: vi.fn() }) as unknown as MediaStreamTrack;

class MockMediaStream {
  private tracks: MediaStreamTrack[];
  constructor(tracks?: MediaStreamTrack[]) {
    this.tracks = tracks ?? [];
  }
  getTracks() {
    return this.tracks;
  }
}

function createMockAudioContext() {
  const gainNode = { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 1.0 } };
  const analyserNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 128,
  };
  const sourceNode = { connect: vi.fn(), disconnect: vi.fn() };
  const destStream = new MockMediaStream();
  const destination = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    stream: destStream,
  };
  const audioElement = {
    autoplay: false,
    style: { display: '' },
    srcObject: null as unknown,
    remove: vi.fn(),
  };

  const ctx = {
    resume: vi.fn(),
    close: vi.fn(),
    createMediaStreamSource: vi.fn(() => sourceNode),
    createGain: vi.fn(() => gainNode),
    createAnalyser: vi.fn(() => analyserNode),
    createMediaStreamDestination: vi.fn(() => destination),
    state: 'running',
    _sourceNode: sourceNode,
    _gainNode: gainNode,
    _analyserNode: analyserNode,
    _destination: destination,
    _audioElement: audioElement,
  };

  return ctx;
}

let mockCtx: ReturnType<typeof createMockAudioContext>;

class StubAudioContext {
  resume = mockCtx.resume;
  close = mockCtx.close;
  createMediaStreamSource = mockCtx.createMediaStreamSource;
  createGain = mockCtx.createGain;
  createAnalyser = mockCtx.createAnalyser;
  createMediaStreamDestination = mockCtx.createMediaStreamDestination;
  state = 'running';
}

const originalCreateElement = document.createElement.bind(document);

vi.stubGlobal('AudioContext', StubAudioContext);
vi.stubGlobal('MediaStream', MockMediaStream);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'audio') {
    return mockCtx._audioElement as unknown as HTMLAudioElement;
  }
  return originalCreateElement(tag);
});

describe('RemoteAudioMixer', () => {
  let mixer: IRemoteAudioMixer;

  beforeEach(async () => {
    mockCtx = createMockAudioContext();
    const { RemoteAudioMixer } = await import('../remote-audio-mixer');
    mixer = new RemoteAudioMixer();
  });

  afterEach(() => {
    mixer.destroy();
  });

  it('creates AudioContext and audio element on construction', () => {
    expect(mockCtx.resume).toHaveBeenCalled();
    expect(mockCtx.createMediaStreamDestination).toHaveBeenCalled();
    expect(mockCtx._audioElement.autoplay).toBe(true);
    expect(mockCtx._audioElement.srcObject).toBe(mockCtx._destination.stream);
  });

  describe('addPeer', () => {
    it('creates source → gain → analyser chain', () => {
      const track = mockTrack('t1');
      mixer.addPeer('user-1', track);

      expect(mockCtx.createMediaStreamSource).toHaveBeenCalled();
      expect(mockCtx.createGain).toHaveBeenCalled();
      expect(mockCtx.createAnalyser).toHaveBeenCalled();

      const source = mockCtx._sourceNode;
      expect(source.connect).toHaveBeenCalledWith(mockCtx._gainNode);
      expect(mockCtx._gainNode.connect).toHaveBeenCalledWith(mockCtx._analyserNode);
      expect(mockCtx._analyserNode.connect).toHaveBeenCalledWith(mockCtx._destination);
    });

    it('replaces existing peer if added again', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.addPeer('user-1', mockTrack('t2'));
      expect(mockCtx.createMediaStreamSource).toHaveBeenCalledTimes(2);
    });
  });

  describe('removePeer', () => {
    it('disconnects nodes and removes peer', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.removePeer('user-1');
      expect(mockCtx._sourceNode.disconnect).toHaveBeenCalled();
    });

    it('is a no-op for unknown peer', () => {
      expect(() => mixer.removePeer('unknown')).not.toThrow();
    });
  });

  describe('updatePeerTrack', () => {
    it('reconnects source with new track', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.updatePeerTrack('user-1', mockTrack('t2'));

      expect(mockCtx._sourceNode.disconnect).toHaveBeenCalled();
      expect(mockCtx.createMediaStreamSource).toHaveBeenCalledTimes(2);
    });

    it('delegates to addPeer if peer not found', () => {
      mixer.updatePeerTrack('unknown', mockTrack('t1'));
      expect(mockCtx.createMediaStreamSource).toHaveBeenCalled();
    });
  });

  describe('setSink', () => {
    it('returns false if setSinkId not supported', async () => {
      const result = await mixer.setSink('device-1');
      expect(result).toBe(false);
    });
  });

  describe('setGain', () => {
    it('sets gain value for peer', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.setGain('user-1', 0.5);
      expect(mockCtx._gainNode.gain.value).toBe(0.5);
    });

    it('clamps gain to 0..1', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.setGain('user-1', 2);
      expect(mockCtx._gainNode.gain.value).toBe(1);
    });

    it('is a no-op for unknown peer', () => {
      expect(() => mixer.setGain('unknown', 0.5)).not.toThrow();
    });
  });

  describe('getAnalyser', () => {
    it('returns analyser for known peer', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      const analyser = mixer.getAnalyser('user-1');
      expect(analyser).toBe(mockCtx._analyserNode);
    });

    it('returns undefined for unknown peer', () => {
      expect(mixer.getAnalyser('unknown')).toBeUndefined();
    });
  });

  describe('getAudioElement', () => {
    it('returns the audio element', () => {
      expect(mixer.getAudioElement()).toBe(mockCtx._audioElement);
    });
  });

  describe('destroy', () => {
    it('closes AudioContext and removes element', () => {
      mixer.addPeer('user-1', mockTrack('t1'));
      mixer.destroy();

      expect(mockCtx._destination.disconnect).toHaveBeenCalled();
      expect(mockCtx.close).toHaveBeenCalled();
      expect(mockCtx._audioElement.remove).toHaveBeenCalled();
    });
  });
});
