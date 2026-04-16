export interface IRemoteAudioMixer {
  addPeer(userId: string, audioTrack: MediaStreamTrack): void;
  removePeer(userId: string): void;
  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void;
  setSink(deviceId: string): Promise<boolean>;
  setGain(userId: string, value: number): void;
  getAnalyser(userId: string): AnalyserNode | undefined;
  destroy(): void;
}

interface PeerNodes {
  audioElement: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  analyser: AnalyserNode;
  analysisSource: MediaStreamAudioSourceNode;
}

export class RemoteAudioMixer implements IRemoteAudioMixer {
  private ctx: AudioContext;
  private peers: Map<string, PeerNodes> = new Map();
  private sinkId: string | null = null;

  constructor() {
    this.ctx = new AudioContext();
    this.resumeCtx();
  }

  private resumeCtx(): void {
    if (this.ctx.state !== "suspended") return;
    void this.ctx.resume();
  }

  addPeer(userId: string, audioTrack: MediaStreamTrack): void {
    if (this.peers.has(userId)) {
      this.removePeer(userId);
    }

    this.resumeCtx();

    // Remote mediasoup tracks only produce data when played through an
    // HTMLAudioElement. Using createMediaStreamSource directly on a mediasoup
    // track results in silence because the browser does not push data into the
    // Web Audio graph until the track is attached to a media element.
    //
    // Playback pipeline: HTMLAudioElement → createMediaElementSource → GainNode → destination
    // Analysis pipeline: createMediaStreamSource (same track, now active) → AnalyserNode
    //
    // The two pipelines are intentionally separate because createMediaElementSource +
    // MediaStream srcObject has a Chrome behaviour where getByteTimeDomainData
    // returns flat (all-128) silence even when audio is audibly playing, likely
    // due to the AudioContext being in "suspended" state causing Chrome to route
    // audio directly from the OS pipeline as a fallback.
    // By keeping the AnalyserNode on a dedicated createMediaStreamSource (which
    // works once the track is being played by the element), we get real audio
    // data for level metering without affecting playback.
    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;
    audioElement.style.display = "none";
    audioElement.srcObject = new MediaStream([audioTrack]);

    if (this.sinkId && "setSinkId" in HTMLMediaElement.prototype) {
      void (
        audioElement as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }
      ).setSinkId(this.sinkId);
    }

    void audioElement.play().catch(() => {});

    // Playback: element → source → gain → destination
    const source = this.ctx.createMediaElementSource(audioElement);
    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    gain.connect(this.ctx.destination);

    // Analysis: separate source on the same track → analyser (not connected to destination)
    const analysisSource = this.ctx.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = this.ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;
    analysisSource.connect(analyser);

    this.peers.set(userId, { audioElement, source, gain, analyser, analysisSource });
  }

  removePeer(userId: string): void {
    const nodes = this.peers.get(userId);
    if (!nodes) return;

    nodes.source.disconnect();
    nodes.gain.disconnect();
    nodes.analysisSource.disconnect();
    nodes.analyser.disconnect();

    nodes.audioElement.pause();
    nodes.audioElement.srcObject = null;
    nodes.audioElement.remove();

    this.peers.delete(userId);
  }

  updatePeerTrack(userId: string, newTrack: MediaStreamTrack): void {
    // When the track changes, rebuild the full peer to rewire both pipelines.
    this.addPeer(userId, newTrack);
  }

  async setSink(deviceId: string): Promise<boolean> {
    if (!("setSinkId" in HTMLMediaElement.prototype)) {
      return false;
    }

    this.sinkId = deviceId;

    const results = await Promise.allSettled(
      Array.from(this.peers.values()).map((nodes) =>
        (
          nodes.audioElement as HTMLAudioElement & {
            setSinkId: (id: string) => Promise<void>;
          }
        ).setSinkId(deviceId),
      ),
    );

    return results.every((r) => r.status === "fulfilled");
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

  destroy(): void {
    for (const userId of Array.from(this.peers.keys())) {
      this.removePeer(userId);
    }

    try {
      void this.ctx.close();
    } catch {
      // ignore
    }
  }
}
