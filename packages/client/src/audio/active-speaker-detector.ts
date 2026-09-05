interface ActiveSpeakerDetectorOptions {
  speakingThreshold?: number;
  holdTime?: number;
  switchMargin?: number;
}

interface SpeakerState {
  activeSpeakerId: string | null;
  speakerSince: number;
  speakerLevel: number;
  silenceSince: number;
}

export class ActiveSpeakerDetector {
  private speakingThreshold: number;
  private holdTime: number;
  private switchMargin: number;
  private state: SpeakerState;

  constructor(options: ActiveSpeakerDetectorOptions = {}) {
    this.speakingThreshold = options.speakingThreshold ?? 0.003;
    this.holdTime = options.holdTime ?? 800;
    this.switchMargin = options.switchMargin ?? 1.3;
    this.state = {
      activeSpeakerId: null,
      speakerSince: 0,
      speakerLevel: 0,
      silenceSince: 0,
    };
  }

  detect(levels: Map<string, number>): string | null {
    const now = Date.now();

    let loudestId: string | null = null;
    let loudestLevel = 0;

    for (const [id, level] of levels) {
      if (level > loudestLevel && level >= this.speakingThreshold) {
        loudestLevel = level;
        loudestId = id;
      }
    }

    if (!loudestId) {
      if (this.state.activeSpeakerId) {
        if (this.state.silenceSince === 0) {
          this.state = { ...this.state, silenceSince: now };
        } else if (now - this.state.silenceSince > this.holdTime) {
          this.state = { activeSpeakerId: null, speakerSince: 0, speakerLevel: 0, silenceSince: 0 };
        }
      }
      return this.state.activeSpeakerId;
    }

    if (!this.state.activeSpeakerId || loudestId === this.state.activeSpeakerId) {
      if (loudestId !== this.state.activeSpeakerId) {
        this.state = {
          activeSpeakerId: loudestId,
          speakerSince: now,
          speakerLevel: loudestLevel,
          silenceSince: 0,
        };
      } else {
        this.state.speakerLevel = loudestLevel;
        this.state.silenceSince = 0;
      }
      return this.state.activeSpeakerId;
    }

    const timeSinceLastSwitch = now - this.state.speakerSince;

    if (timeSinceLastSwitch < this.holdTime) {
      return this.state.activeSpeakerId;
    }

    if (loudestLevel > this.state.speakerLevel * this.switchMargin) {
      this.state = {
        activeSpeakerId: loudestId,
        speakerSince: now,
        speakerLevel: loudestLevel,
        silenceSince: 0,
      };
    }

    return this.state.activeSpeakerId;
  }

  reset(): void {
    this.state = {
      activeSpeakerId: null,
      speakerSince: 0,
      speakerLevel: 0,
      silenceSince: 0,
    };
  }
}
