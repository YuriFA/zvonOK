import type {
  WorkerSettings,
  RouterOptions,
  WebRtcTransportOptions,
} from 'mediasoup/types';

/**
 * ICE server entry sent to clients for RTCPeerConnection configuration.
 * Matches the browser RTCIceServer interface.
 */
export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

/**
 * Build ICE servers list from environment variables.
 * Always includes Google public STUN as a baseline.
 * Appends TURN server when TURN_URL + TURN_USER + TURN_PASSWORD are set.
 */
export function getIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ];

  const turnUrl = process.env.TURN_URL;
  const turnsUrl = process.env.TURNS_URL;
  const turnUser = process.env.TURN_USER;
  const turnPassword = process.env.TURN_PASSWORD;

  if (turnUrl && turnUser && turnPassword) {
    servers.push({
      urls: [turnUrl, ...(turnsUrl ? [turnsUrl] : [])],
      username: turnUser,
      credential: turnPassword,
    });
  }

  return servers;
}

export const config = {
  worker: {
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000', 10),
    rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '40099', 10),
  } satisfies WorkerSettings,

  webRtcTransport: {
    listenIps: [
      {
        ip: process.env.MEDIASOUP_LISTEN_IP || '127.0.0.1',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  } satisfies WebRtcTransportOptions,

  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ],
  } satisfies RouterOptions,
};
