import {
  EGRESS_HLS_LIST_SIZE,
  EGRESS_HLS_SEGMENT_SECONDS,
} from '../egress.config';
import type { EgressOutputs, EgressPipelineInput } from '../egress.types';

/** Tile geometry: a 2x2 grid of 640x360 tiles fills the 1280x720 canvas. */
const TILE_WIDTH = 640;
const TILE_HEIGHT = 360;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const CANVAS_FPS = 25;
const XSTACK_LAYOUT_2X2 = ['0_0', 'w0_0', '0_h0', 'w0_h0'];

/**
 * Stable input order for the pipeline: audio inputs first, then video with an
 * active screen share taking the primary tile, then the remaining cameras.
 * Each group keeps the caller's array order.
 */
function sortedInputs(inputs: EgressPipelineInput[]): EgressPipelineInput[] {
  const audio = inputs.filter((input) => input.descriptor.kind === 'audio');
  const screens = inputs.filter(
    (input) =>
      input.descriptor.kind === 'video' && input.descriptor.source === 'screen',
  );
  const cameras = inputs.filter(
    (input) =>
      input.descriptor.kind === 'video' && input.descriptor.source === 'camera',
  );
  return [...audio, ...screens, ...cameras];
}

/**
 * Build the SDP file content describing one RTP listener (a mediasoup
 * PlainTransport feeding FFmpeg over UDP on 127.0.0.1).
 *
 * Codec lines derive from the consumer's `rtpParameters` (first codec), with
 * `a=fmtp` passthrough of the codec's signaling parameters when present.
 */
export function generateSdp(input: EgressPipelineInput): string {
  const codec = input.rtpParameters.codecs[0];
  if (!codec) {
    throw new Error(
      `producer ${input.descriptor.producerId} has no codecs to signal in SDP`,
    );
  }
  const encodingName = codec.mimeType.split('/')[1];
  const channels =
    input.descriptor.kind === 'audio' && codec.channels && codec.channels > 1
      ? `/${codec.channels}`
      : '';
  const lines = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=zvonok-egress',
    't=0 0',
    'c=IN IP4 127.0.0.1',
    `m=${input.descriptor.kind} ${input.port} RTP/AVP ${codec.payloadType}`,
    `a=rtpmap:${codec.payloadType} ${encodingName}/${codec.clockRate}${channels}`,
  ];
  const parameters = Object.entries(codec.parameters ?? {});
  if (parameters.length > 0) {
    const fmtp = parameters
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(';');
    lines.push(`a=fmtp:${codec.payloadType} ${fmtp}`);
  }
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Compose the full FFmpeg argv (without the binary) for one egress session:
 * every input's SDP file, the mixed-audio + composited-video filter graph,
 * and a single tee muxer fanning out to all requested outputs.
 *
 * `hlsDir` is only required when `outputs.hls` is true; it is the segment
 * directory the HLS playlist and segments are written to.
 */
export function composeEgressArgs(
  inputs: EgressPipelineInput[],
  outputs: EgressOutputs & { hlsDir?: string },
): string[] {
  const ordered = sortedInputs(inputs);
  const audioCount = ordered.filter(
    (input) => input.descriptor.kind === 'audio',
  ).length;
  const videoCount = ordered.length - audioCount;
  if (audioCount === 0) {
    throw new Error('egress pipeline requires at least one audio input');
  }
  if (videoCount > XSTACK_LAYOUT_2X2.length) {
    throw new Error(
      `egress canvas composites at most ${XSTACK_LAYOUT_2X2.length} video inputs, got ${videoCount}`,
    );
  }

  const args: string[] = [
    '-nostdin',
    '-loglevel',
    'warning',
    '-progress',
    'pipe:1',
  ];
  for (const input of ordered) {
    // The whitelist is an input-scoped option: it must precede every -i or
    // later inputs fall back to the SDP demuxer's restrictive default.
    args.push('-protocol_whitelist', 'file,udp,rtp', '-i', input.sdpPath);
  }
  args.push('-filter_complex', composeFilterComplex(audioCount, videoCount));
  args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
  if (videoCount > 0) {
    // RTMP endpoints and MPEG-TS HLS segments both require H.264; VP8/VP9
    // sources are always transcoded exactly once, here.
    args.push(
      '-map',
      '[vout]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-b:v',
      '2500k',
      '-r',
      String(CANVAS_FPS),
    );
  }
  args.push('-f', 'tee', composeTeeSpec(outputs));
  return args;
}

/** amix over all audio inputs; scale/pad/xstack video tiles onto the canvas. */
function composeFilterComplex(audioCount: number, videoCount: number): string {
  const segments: string[] = [];

  if (audioCount === 1) {
    segments.push(`[0:a]anull[aout]`);
  } else {
    const audioLabels: string[] = [];
    for (let index = 0; index < audioCount; index++) {
      audioLabels.push(`[${index}:a]`);
    }
    segments.push(
      `${audioLabels.join('')}amix=inputs=${audioCount}:normalize=0[aout]`,
    );
  }

  if (videoCount === 1) {
    // A lone video fills the whole canvas; xstack requires >= 2 inputs.
    segments.push(
      `[${audioCount}:v]scale=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:force_original_aspect_ratio=decrease,` +
        `pad=${CANVAS_WIDTH}:${CANVAS_HEIGHT}:(ow-iw)/2:(oh-ih)/2[vout]`,
    );
  } else if (videoCount > 1) {
    segments.push(
      `color=c=black:s=${CANVAS_WIDTH}x${CANVAS_HEIGHT}:r=${CANVAS_FPS}[base]`,
    );
    for (let tile = 0; tile < videoCount; tile++) {
      const inputIndex = audioCount + tile;
      segments.push(
        `[${inputIndex}:v]scale=${TILE_WIDTH}:${TILE_HEIGHT}:force_original_aspect_ratio=decrease,` +
          `pad=${TILE_WIDTH}:${TILE_HEIGHT}:(ow-iw)/2:(oh-ih)/2[t${tile}]`,
      );
    }
    const tileLabels: string[] = [];
    for (let tile = 0; tile < videoCount; tile++) {
      tileLabels.push(`[t${tile}]`);
    }
    const layout = XSTACK_LAYOUT_2X2.slice(0, videoCount).join('|');
    segments.push(
      `${tileLabels.join('')}xstack=inputs=${videoCount}:layout=${layout}[stacked]`,
    );
    segments.push(`[base][stacked]overlay=0:0:shortest=1[vout]`);
  }
  return segments.join(';');
}

/** `[f=flv:onfail=ignore]` per RTMP endpoint, plus the HLS branch when asked. */
function composeTeeSpec(outputs: EgressOutputs & { hlsDir?: string }): string {
  if (outputs.rtmpEndpoints.length === 0 && !outputs.hls) {
    throw new Error(
      'egress pipeline requires at least one output (RTMP endpoint or HLS)',
    );
  }
  const targets = outputs.rtmpEndpoints.map(
    (endpoint) => `[f=flv:onfail=ignore]${endpoint}`,
  );
  if (outputs.hls) {
    if (!outputs.hlsDir) {
      throw new Error('hlsDir is required when outputs.hls is true');
    }
    targets.push(
      `[f=hls:hls_time=${EGRESS_HLS_SEGMENT_SECONDS}:hls_list_size=${EGRESS_HLS_LIST_SIZE}:` +
        `hls_flags=delete_segments+independent_segments:` +
        `hls_segment_filename=${outputs.hlsDir}/seg_%03d.ts]` +
        `${outputs.hlsDir}/index.m3u8`,
    );
  }
  return targets.join('|');
}
