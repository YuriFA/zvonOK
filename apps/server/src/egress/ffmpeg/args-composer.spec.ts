import type { RtpParameters } from 'mediasoup/types';
import {
  EGRESS_HLS_LIST_SIZE,
  EGRESS_HLS_SEGMENT_SECONDS,
} from '../egress.config';
import type { EgressPipelineInput } from '../egress.types';
import { composeEgressArgs, generateSdp } from './args-composer';

function opusRtpParameters(
  overrides: Partial<{ payloadType: number; channels: number }> = {},
): RtpParameters {
  return {
    codecs: [
      {
        mimeType: 'audio/opus',
        payloadType: overrides.payloadType ?? 100,
        clockRate: 48000,
        channels: overrides.channels ?? 2,
        parameters: { useinbandfec: 1 },
      },
    ],
  };
}

function vp8RtpParameters(parameters?: Record<string, unknown>): RtpParameters {
  return {
    codecs: [
      {
        mimeType: 'video/VP8',
        payloadType: 96,
        clockRate: 90000,
        ...(parameters ? { parameters } : {}),
      },
    ],
  };
}

function tapInput(options: {
  kind: 'audio' | 'video';
  source: 'camera' | 'screen';
  sdpPath: string;
  port: number;
  rtpParameters: RtpParameters;
}): EgressPipelineInput {
  return {
    descriptor: {
      producerId: `producer-${options.sdpPath}`,
      kind: options.kind,
      source: options.source,
    },
    rtpParameters: options.rtpParameters,
    sdpPath: options.sdpPath,
    port: options.port,
  };
}

function inputPaths(args: string[]): string[] {
  const paths: string[] = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '-i') {
      paths.push(args[index + 1]);
    }
  }
  return paths;
}

function filterGraph(args: string[]): string {
  return args[args.indexOf('-filter_complex') + 1];
}

describe('composeEgressArgs', () => {
  const audio = tapInput({
    kind: 'audio',
    source: 'camera',
    sdpPath: '/tmp/audio.sdp',
    port: 42000,
    rtpParameters: opusRtpParameters(),
  });
  const cameraVideo = tapInput({
    kind: 'video',
    source: 'camera',
    sdpPath: '/tmp/camera.sdp',
    port: 42002,
    rtpParameters: vp8RtpParameters(),
  });
  const screenVideo = tapInput({
    kind: 'video',
    source: 'screen',
    sdpPath: '/tmp/screen.sdp',
    port: 42001,
    rtpParameters: vp8RtpParameters(),
  });

  it('orders inputs, composites video with screen share in the primary tile and tees all outputs', () => {
    const args = composeEgressArgs([cameraVideo, audio, screenVideo], {
      rtmpEndpoints: ['rtmp://one/live', 'rtmp://two/live'],
      hls: true,
      record: false,
      hlsDir: '/tmp/hls',
    });

    expect(args.slice(0, 5)).toEqual([
      '-nostdin',
      '-loglevel',
      'warning',
      '-progress',
      'pipe:1',
    ]);
    expect(args.filter((arg) => arg === '-protocol_whitelist')).toHaveLength(3);
    expect(inputPaths(args)).toEqual([
      '/tmp/audio.sdp',
      '/tmp/screen.sdp',
      '/tmp/camera.sdp',
    ]);

    const graph = filterGraph(args);
    const segments = graph.split(';');
    expect(segments[0]).toBe('[0:a]anull[aout]');
    expect(segments[1]).toBe('color=c=black:s=1280x720:r=25[base]');
    expect(segments[2]).toBe(
      '[1:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[t0]',
    );
    expect(segments[3]).toBe(
      '[2:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[t1]',
    );
    expect(segments[4]).toBe(
      '[t0][t1]xstack=inputs=2:layout=0_0|w0_0[stacked]',
    );
    expect(segments[5]).toBe('[base][stacked]overlay=0:0:shortest=1[vout]');

    const mapIndex = args.indexOf('-map');
    expect(args.slice(mapIndex, mapIndex + 18)).toEqual([
      '-map',
      '[aout]',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
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
      '25',
    ]);

    expect(args.slice(-3)).toEqual([
      '-f',
      'tee',
      `[f=flv:onfail=ignore]rtmp://one/live|[f=flv:onfail=ignore]rtmp://two/live|` +
        `[f=hls:hls_time=${EGRESS_HLS_SEGMENT_SECONDS}:hls_list_size=${EGRESS_HLS_LIST_SIZE}:` +
        `hls_flags=delete_segments+independent_segments:` +
        `hls_segment_filename=/tmp/hls/seg_%03d.ts]/tmp/hls/index.m3u8`,
    ]);
  });

  it('builds an audio-only program without any video branch', () => {
    const secondAudio = tapInput({
      kind: 'audio',
      source: 'camera',
      sdpPath: '/tmp/audio-2.sdp',
      port: 42003,
      rtpParameters: opusRtpParameters({ payloadType: 111 }),
    });
    const args = composeEgressArgs([secondAudio, audio], {
      rtmpEndpoints: ['rtmp://only/live'],
      hls: false,
      record: false,
    });

    expect(inputPaths(args)).toEqual(['/tmp/audio-2.sdp', '/tmp/audio.sdp']);
    expect(filterGraph(args)).toBe('[0:a][1:a]amix=inputs=2:normalize=0[aout]');
    expect(args).not.toContain('-r');
    expect(args).not.toContain('[vout]');
    expect(args.slice(-3)).toEqual([
      '-f',
      'tee',
      '[f=flv:onfail=ignore]rtmp://only/live',
    ]);
  });

  it('tees the composited program to a numbered Matroska recording part', () => {
    const args = composeEgressArgs([audio], {
      rtmpEndpoints: [],
      hls: false,
      record: true,
      recordingDir: '/tmp/recordings/egress-1',
      recordingPart: 2,
    });
    expect(args.slice(-3)).toEqual([
      '-f',
      'tee',
      '[f=mpegts]/tmp/recordings/egress-1/recording-2.ts',
    ]);

    const restarted = composeEgressArgs([audio], {
      rtmpEndpoints: [],
      hls: false,
      record: true,
      recordingDir: '/tmp/recordings/egress-1',
    });
    expect(restarted.slice(-1)).toEqual([
      '[f=mpegts]/tmp/recordings/egress-1/recording-0.ts',
    ]);
  });

  it('rejects pipelines without audio, with too many videos, without outputs, or HLS without a directory', () => {
    const fiveVideos = [1, 2, 3, 4, 5].map((index) =>
      tapInput({
        kind: 'video',
        source: 'camera',
        sdpPath: `/tmp/v${index}.sdp`,
        port: 42010 + index,
        rtpParameters: vp8RtpParameters(),
      }),
    );
    expect(() =>
      composeEgressArgs([cameraVideo], {
        rtmpEndpoints: ['rtmp://one/live'],
        hls: false,
        record: false,
      }),
    ).toThrow('at least one audio input');
    expect(() =>
      composeEgressArgs([audio, ...fiveVideos], {
        rtmpEndpoints: ['rtmp://one/live'],
        hls: false,
        record: false,
      }),
    ).toThrow('at most 4 video inputs');
    expect(() =>
      composeEgressArgs([audio], {
        rtmpEndpoints: [],
        hls: false,
        record: false,
      }),
    ).toThrow('at least one output');
    expect(() =>
      composeEgressArgs([audio], {
        rtmpEndpoints: ['rtmp://one/live'],
        hls: true,
        record: false,
      }),
    ).toThrow('hlsDir is required');
    expect(() =>
      composeEgressArgs([audio], {
        rtmpEndpoints: [],
        hls: false,
        record: true,
      }),
    ).toThrow('recordingDir is required');
  });
});

describe('generateSdp', () => {
  it('describes one opus RTP listener with fmtp passthrough', () => {
    const sdp = generateSdp(
      tapInput({
        kind: 'audio',
        source: 'camera',
        sdpPath: '/tmp/audio.sdp',
        port: 42000,
        rtpParameters: opusRtpParameters(),
      }),
    );

    expect(sdp).toBe(
      [
        'v=0',
        'o=- 0 0 IN IP4 127.0.0.1',
        's=zvonok-egress',
        't=0 0',
        'c=IN IP4 127.0.0.1',
        'm=audio 42000 RTP/AVP 100',
        'a=rtpmap:100 opus/48000/2',
        'a=fmtp:100 useinbandfec=1',
      ].join('\r\n') + '\r\n',
    );
  });

  it('describes one VP8 RTP listener and omits fmtp when parameters are empty', () => {
    const sdp = generateSdp(
      tapInput({
        kind: 'video',
        source: 'screen',
        sdpPath: '/tmp/screen.sdp',
        port: 42001,
        rtpParameters: vp8RtpParameters(),
      }),
    );

    expect(sdp).toContain('m=video 42001 RTP/AVP 96\r\n');
    expect(sdp).toContain('a=rtpmap:96 VP8/90000\r\n');
    expect(sdp).not.toContain('a=fmtp');
  });

  it('passes multiple fmtp parameters through and skips channel suffix for mono audio', () => {
    const video = generateSdp(
      tapInput({
        kind: 'video',
        source: 'camera',
        sdpPath: '/tmp/video.sdp',
        port: 42002,
        rtpParameters: vp8RtpParameters({
          'x-google-start-bitrate': 1000,
          'profile-id': 42,
        }),
      }),
    );
    const mono = generateSdp(
      tapInput({
        kind: 'audio',
        source: 'camera',
        sdpPath: '/tmp/mono.sdp',
        port: 42003,
        rtpParameters: opusRtpParameters({ payloadType: 111, channels: 1 }),
      }),
    );

    expect(video).toContain(
      'a=fmtp:96 x-google-start-bitrate=1000;profile-id=42\r\n',
    );
    expect(mono).toContain('a=rtpmap:111 opus/48000\r\n');
    expect(mono).not.toContain('opus/48000/');
  });
});
