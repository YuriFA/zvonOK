export interface IRemoteAudioMixer {
  addPeer(userId: string, audioTrack: MediaStreamTrack): void;
  removePeer(userId: string): void;
  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void;
  setSink(deviceId: string): Promise<boolean>;
  setGain(userId: string, value: number): void;
  getAnalyser(userId: string): AnalyserNode | undefined;
  getAudioElement(): HTMLAudioElement;
  destroy(): void;
}

interface PeerNodes {
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
}

export class RemoteAudioMixer implements IRemoteAudioMixer {
  private ctx: AudioContext;
  private peers: Map<string, PeerNodes> = new Map();
  private destination: MediaStreamAudioDestinationNode;
  private audioElement: HTMLAudioElement;

  constructor() {
    this.ctx = new AudioContext();
    void this.ctx.resume();

    this.destination = this.ctx.createMediaStreamDestination();

    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.style.display = "none";
    this.audioElement.srcObject = this.destination.stream;
  }

  addPeer(userId: string, audioTrack: MediaStreamTrack): void {
    if (this.peers.has(userId)) {
      this.removePeer(userId);
    }

    const stream = new MediaStream([audioTrack]);
    const source = this.ctx.createMediaStreamSource(stream);
    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.destination);

    this.peers.set(userId, { stream, source, gain, analyser });
  }

  removePeer(userId: string): void {
    const nodes = this.peers.get(userId);
    if (!nodes) return;

    nodes.source.disconnect();
    nodes.gain.disconnect();
    nodes.analyser.disconnect();

    this.peers.delete(userId);
  }

  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void {
    const nodes = this.peers.get(userId);
    if (!nodes) {
      this.addPeer(userId, newTrack);
      return;
    }

    nodes.source.disconnect();

    const stream = new MediaStream([newTrack]);
    const source = this.ctx.createMediaStreamSource(stream);
    source.connect(nodes.gain);

    nodes.stream = stream;
    nodes.source = source;
  }

  async setSink(deviceId: string): Promise<boolean> {
    if (!("setSinkId" in HTMLMediaElement.prototype)) {
      return false;
    }

    try {
      await (
        this.audioElement as HTMLAudioElement & {
          setSinkId: (id: string) => Promise<void>;
        }
      ).setSinkId(deviceId);
      return true;
    } catch {
      return false;
    }
  }

  setGain(userId: string, value: number): void {
    const nodes = this.peers.get(userId);
    if (nodes) {
      nodes.gain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  getAnalyser(userId: string): AnalyserNode | undefined {
    return this.peers.get(userId)?.analyser;
  }

  getAudioElement(): HTMLAudioElement {
    return this.audioElement;
  }

  destroy(): void {
    for (const userId of Array.from(this.peers.keys())) {
      this.removePeer(userId);
    }

    this.destination.disconnect();

    try {
      void this.ctx.close();
    } catch {
      // ignore
    }

    this.audioElement.srcObject = null;
    this.audioElement.remove();
  }
}
