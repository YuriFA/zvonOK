import { computeLayout } from "@zvonok/video-layout";

/**
 * A participant (or screen share) that the composited program should show.
 * The same source object drives the hidden `<video>` element lifecycle, so
 * sources are diffed by `id` on every update.
 */
export interface RecordingSource {
  /** Stable identity of the source (user id, or `screen:<user id>`). */
  id: string;
  /** Display name rendered on the tile. */
  label: string;
  /** Stream carrying the video track to draw; `null` renders a placeholder. */
  stream: MediaStream | null;
  /** Local participant's tile: drawn mirrored like the room's self-view. */
  isLocal: boolean;
  /** Screen share: drawn into the spotlight area instead of a grid tile. */
  isScreen: boolean;
}

export interface CallRecordingCompositorOptions {
  width?: number;
  height?: number;
}

const TILE_BACKGROUND = "#1c1f26";
const LABEL_BACKGROUND = "rgba(0, 0, 0, 0.5)";
const LABEL_COLOR = "#ffffff";

/**
 * Composites recording sources onto an offscreen canvas: a grid of
 * participant tiles, or a spotlight layout with the active screen share in
 * the spotlight area and participants in the strip. The canvas capture
 * stream is the video program for the call recording.
 *
 * The render loop draws at a fixed canvas resolution independent of the
 * viewport, so the output layout is stable across window resizes.
 */
export class CallRecordingCompositor {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly width: number;
  private readonly height: number;
  private readonly videos = new Map<string, HTMLVideoElement>();
  private sources: RecordingSource[] = [];
  private captureStream: MediaStream | null = null;
  private frame = 0;

  constructor(options: CallRecordingCompositorOptions = {}) {
    this.width = options.width ?? 1280;
    this.height = options.height ?? 720;
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }
    this.context = context;
  }

  /** Diff the previous sources against the new ones, updating hidden `<video>` elements. */
  setSources(sources: RecordingSource[]): void {
    const nextIds = new Set(sources.map((source) => source.id));
    for (const [id, video] of this.videos) {
      if (!nextIds.has(id)) {
        video.srcObject = null;
        this.videos.delete(id);
      }
    }
    for (const source of sources) {
      if (source.stream !== null && !this.videos.has(source.id)) {
        this.videos.set(source.id, this.createVideo(source));
      }
    }
    this.sources = sources;
  }

  /** Start the render loop and return the capture stream used as the video program. */
  start(): MediaStream {
    if (this.captureStream === null) {
      this.captureStream = this.canvas.captureStream(30);
    }
    this.renderFrame();
    this.frame = requestAnimationFrame(this.tick);
    return this.captureStream;
  }
  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const track of this.captureStream?.getTracks() ?? []) {
      track.stop();
    }
    this.captureStream = null;
    for (const video of this.videos.values()) {
      video.srcObject = null;
    }
    this.videos.clear();
    this.sources = [];
  }

  /** Renders exactly one frame. Public so tests can advance the program deterministically. */
  renderFrame(): void {
    const context = this.context;
    context.fillStyle = TILE_BACKGROUND;
    context.fillRect(0, 0, this.width, this.height);

    const cameraSources = this.sources.filter((source) => !source.isScreen);
    const screenSource = this.sources.find((source) => source.isScreen);
    const hasScreen = screenSource !== undefined && this.hasLiveVideo(screenSource);

    const layout = computeLayout({
      containerWidth: this.width,
      containerHeight: this.height,
      participantCount: cameraSources.length,
      spotlight: hasScreen,
    });

    if (hasScreen && screenSource) {
      const area = layout.spotlightArea;
      if (area) {
        this.drawSource(screenSource, area.x, area.y, area.width, area.height, false);
      }
    }

    cameraSources.forEach((source, index) => {
      const tile = layout.tiles[index];
      if (!tile) {
        return;
      }
      this.drawSource(source, tile.x, tile.y, tile.width, tile.height, source.isLocal);
    });
  }

  private tick = (): void => {
    this.renderFrame();
    this.frame = requestAnimationFrame(this.tick);
  };

  private createVideo(source: RecordingSource): HTMLVideoElement {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = source.stream;
    void video.play().catch(() => {
      // Autoplay of a muted element can still be refused; the compositor
      // retries implicitly because drawImage keeps using the last frame.
    });
    return video;
  }

  private hasLiveVideo(source: RecordingSource): boolean {
    const stream = source.stream;
    if (stream == null || typeof stream.getVideoTracks !== "function") {
      return false;
    }
    return stream.getVideoTracks().some((track) => track.readyState === "live" && !track.muted);
  }

  private drawSource(
    source: RecordingSource,
    x: number,
    y: number,
    width: number,
    height: number,
    mirror: boolean,
  ): void {
    if (this.hasLiveVideo(source)) {
      const video = this.videos.get(source.id);
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        this.drawVideoCovered(video, x, y, width, height, mirror);
      } else {
        this.drawPlaceholder(source, x, y, width, height);
      }
    } else {
      this.drawPlaceholder(source, x, y, width, height);
    }
    this.drawLabel(source.label, x, y, height);
  }

  /** Draws the video crop-to-fill (object-cover) into the given rectangle. */
  private drawVideoCovered(
    video: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
    mirror: boolean,
  ): void {
    const videoRatio = video.videoWidth / video.videoHeight;
    const tileRatio = width / height;
    let cropWidth = video.videoWidth;
    let cropHeight = video.videoHeight;
    if (videoRatio > tileRatio) {
      cropWidth = video.videoHeight * tileRatio;
    } else {
      cropHeight = video.videoWidth / tileRatio;
    }
    const cropX = (video.videoWidth - cropWidth) / 2;
    const cropY = (video.videoHeight - cropHeight) / 2;

    this.context.save();
    if (mirror) {
      this.context.translate(x + width, y);
      this.context.scale(-1, 1);
      this.context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, width, height);
    } else {
      this.context.drawImage(video, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
    }
    this.context.restore();
  }

  private drawPlaceholder(
    source: RecordingSource,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const context = this.context;
    context.fillStyle = TILE_BACKGROUND;
    context.fillRect(x, y, width, height);
    context.fillStyle = LABEL_COLOR;
    context.font = `${Math.round(Math.min(width, height) / 6)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initialsOf(source.label), x + width / 2, y + height / 2);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  }

  private drawLabel(label: string, x: number, y: number, height: number): void {
    const context = this.context;
    if (!label) {
      return;
    }
    context.font = "14px sans-serif";
    const textWidth = context.measureText(label).width;
    const labelWidth = textWidth + 16;
    const labelHeight = 24;
    context.fillStyle = LABEL_BACKGROUND;
    context.fillRect(x, y + height - labelHeight - 8, labelWidth, labelHeight);
    context.fillStyle = LABEL_COLOR;
    context.textBaseline = "middle";
    context.fillText(label, x + 8, y + height - labelHeight / 2 - 8);
    context.textBaseline = "alphabetic";
  }
}

function initialsOf(label: string): string {
  const words = label
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return "?";
  }
  const chars = words.map((word) => word.charAt(0).toUpperCase());
  return chars.slice(0, 2).join("");
}
