jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));
jest.mock('src/sfu/sfu.service', () => ({
  SfuService: jest.fn(),
}));
jest.mock('src/webhooks/webhook-dispatcher.service', () => ({
  WebhookDispatcher: jest.fn(),
}));
jest.mock('./ffmpeg/args-composer', () => ({
  generateSdp: jest.fn(() => 'sdp-content'),
  composeEgressArgs: jest.fn(() => ['-nostdin']),
}));
jest.mock('./ffmpeg/ffmpeg-process', () => ({
  FFmpegProcess: { spawn: jest.fn() },
}));
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EgressService } from './egress.service';
import { FFmpegProcess } from './ffmpeg/ffmpeg-process';
import type { EgressTapDescriptor } from './egress.types';

interface FakeProcess {
  handlers: Map<string, Array<(...args: unknown[]) => void>>;
  on(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  stop: jest.Mock;
}

function makeFakeProcess(): FakeProcess {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  return {
    handlers,
    on: (event, callback) => {
      handlers.set(event, [...(handlers.get(event) ?? []), callback]);
    },
    emit: (event, ...args) => {
      for (const callback of handlers.get(event) ?? []) callback(...args);
    },
    stop: jest.fn().mockResolvedValue(undefined),
  };
}

/** Real macrotask turn: drains pending microtask chains across boundaries. */
const flush = () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setImmediate(resolve);
  return promise;
};

describe('EgressService', () => {
  let service: EgressService;
  let prisma: {
    room: { findUnique: jest.Mock };
    egress: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let sfu: {
    listRoomProducers: jest.Mock;
    createEgressTransport: jest.Mock;
    createEgressConsumer: jest.Mock;
    onRoomProducerAdded: jest.Mock;
    onRoomClosed: jest.Mock;
  };
  let webhooks: {
    egressStarted: jest.Mock;
    egressStopped: jest.Mock;
    egressFailed: jest.Mock;
  };
  let spawned: FakeProcess[];

  function latestProcess(): FakeProcess {
    const proc = spawned.at(-1);
    if (!proc) throw new Error('no egress process spawned yet');
    return proc;
  }

  let rowCounter: number;

  function makeRow(overrides: Record<string, unknown> = {}) {
    rowCounter += 1;
    return {
      id: `egress-${rowCounter}`,
      roomId: 'room-1',
      projectId: 'project-1',
      outputs: { rtmpEndpoints: ['rtmp://example.com/live'], hls: true },
      status: 'starting',
      endedReason: null,
      error: null,
      startedAt: new Date(),
      endedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick'] });
    rowCounter = 0;
    spawned = [];
    prisma = {
      room: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'room-1',
          slug: 'room-slug',
          projectId: 'project-1',
          status: 'active',
        }),
      },
      egress: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(({ data }) => makeRow({ ...data, id: undefined })),
        update: jest.fn(({ data }) => makeRow({ ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    prisma.egress.create.mockImplementation(({ data }) =>
      makeRow({ ...data, id: `egress-${rowCounter + 1}` }),
    );
    prisma.egress.update.mockImplementation(async ({ data }) =>
      makeRow(data as Record<string, unknown>),
    );
    sfu = {
      listRoomProducers: jest.fn(() => [
        { producerId: 'p1', kind: 'audio', source: 'camera' },
      ]),
      createEgressTransport: jest.fn().mockResolvedValue({
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
      }),
      createEgressConsumer: jest.fn().mockResolvedValue({
        consumer: {
          rtpParameters: { codecs: [] },
          on: jest.fn(),
          close: jest.fn(),
        },
        rtpParameters: { codecs: [] },
      }),
      onRoomProducerAdded: jest.fn().mockReturnValue(jest.fn()),
      onRoomClosed: jest.fn().mockReturnValue(jest.fn()),
    };
    webhooks = {
      egressStarted: jest.fn(),
      egressStopped: jest.fn(),
      egressFailed: jest.fn(),
    };
    (FFmpegProcess.spawn as jest.Mock).mockImplementation(() => {
      const fake = makeFakeProcess();
      spawned.push(fake);
      return fake;
    });
    service = new EgressService(
      prisma as never,
      sfu as never,
      webhooks as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconciles orphaned rows on module init', async () => {
    await service.onModuleInit();
    expect(prisma.egress.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('rejects start without outputs', async () => {
    await expect(
      service.start('project-1', 'room-1', { rtmpEndpoints: [], hls: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects start for a foreign room and for an ended room', async () => {
    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      slug: 's',
      projectId: 'other-project',
      status: 'active',
    });
    await expect(
      service.start('project-1', 'room-1', { rtmpEndpoints: [], hls: true }),
    ).rejects.toThrow(NotFoundException);

    prisma.room.findUnique.mockResolvedValue({
      id: 'room-1',
      slug: 's',
      projectId: 'project-1',
      status: 'ended',
    });
    await expect(
      service.start('project-1', 'room-1', { rtmpEndpoints: [], hls: true }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a second active session for the same room', async () => {
    prisma.egress.findFirst.mockResolvedValue(makeRow({ status: 'live' }));
    await expect(
      service.start('project-1', 'room-1', { rtmpEndpoints: [], hls: true }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects private RTMP targets by default', async () => {
    await expect(
      service.start('project-1', 'room-1', {
        rtmpEndpoints: ['rtmp://127.0.0.1/live'],
        hls: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('builds the pipeline and transitions to live on first progress', async () => {
    const view = await service.start('project-1', 'room-1', {
      rtmpEndpoints: ['rtmp://example.com/live'],
      hls: true,
    });
    expect(view.status).toBe('starting');
    expect(FFmpegProcess.spawn).toHaveBeenCalledTimes(1);
    expect(sfu.createEgressTransport).toHaveBeenCalledWith('room-1');

    spawned[0].emit('progress', 'out_time_ms=1');
    await flush();
    expect(prisma.egress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'live' }),
      }),
    );
    expect(webhooks.egressStarted).toHaveBeenCalledWith(
      'room-1',
      'room-slug',
      expect.any(String),
      { rtmpEndpoints: ['rtmp://example.com/live'], hls: true },
    );
  });

  it('exhausts the start budget after repeated timeouts, then fails', async () => {
    await service.start('project-1', 'room-1', {
      rtmpEndpoints: [],
      hls: true,
    });

    // The first three start timeouts rebuild the pipeline...
    for (let attempt = 0; attempt < 3; attempt++) {
      await jest.advanceTimersToNextTimerAsync();
      await flush();
    }
    expect(FFmpegProcess.spawn).toHaveBeenCalledTimes(4);
    expect(webhooks.egressFailed).not.toHaveBeenCalled();

    // ...the fourth one exhausts the bounded retry budget.
    await jest.advanceTimersToNextTimerAsync();
    await flush();
    expect(prisma.egress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('timed out'),
        }),
      }),
    );
    expect(webhooks.egressFailed).toHaveBeenCalled();
  });

  it('restarts the pipeline on exit within the retry budget, then fails', async () => {
    await service.start('project-1', 'room-1', {
      rtmpEndpoints: [],
      hls: true,
    });
    spawned[0].emit('progress', 'out_time_ms=1');
    await flush();

    for (let attempt = 0; attempt < 3; attempt++) {
      latestProcess().emit('exit', 1, null);
      await flush();
    }
    expect(FFmpegProcess.spawn).toHaveBeenCalledTimes(4);

    latestProcess().emit('exit', 1, null);
    await flush();
    expect(prisma.egress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
    expect(webhooks.egressFailed).toHaveBeenCalled();
  });

  it('rebuilds the pipeline after a membership change, debounced', async () => {
    await service.start('project-1', 'room-1', {
      rtmpEndpoints: [],
      hls: true,
    });
    const handler = sfu.onRoomProducerAdded.mock.calls[0][1] as (
      descriptor: EgressTapDescriptor,
    ) => void;
    spawned[0].emit('progress', 'out_time_ms=1');
    await flush();
    const spawnsBefore = (FFmpegProcess.spawn as jest.Mock).mock.calls.length;
    handler({ producerId: 'p2', kind: 'video', source: 'screen' });
    await jest.advanceTimersToNextTimerAsync();
    await flush();
    expect(FFmpegProcess.spawn).toHaveBeenCalledTimes(spawnsBefore + 1);
  });

  it('stops a live session and reports ended/stopped', async () => {
    const started = await service.start('project-1', 'room-1', {
      rtmpEndpoints: [],
      hls: true,
    });
    spawned[0].emit('progress', 'out_time_ms=1');
    await flush();
    prisma.egress.findUnique.mockResolvedValue(
      makeRow({ id: started.id, status: 'live' }),
    );
    prisma.egress.findUniqueOrThrow.mockResolvedValue(
      makeRow({ id: started.id, status: 'ended', endedReason: 'stopped' }),
    );

    const stopped = await service.stop('project-1', started.id);
    expect(stopped.status).toBe('ended');
    expect(stopped.endedReason).toBe('stopped');
    expect(spawned[0].stop).toHaveBeenCalled();
    expect(webhooks.egressStopped).toHaveBeenCalledWith(
      'room-1',
      'room-slug',
      expect.any(String),
      { rtmpEndpoints: [], hls: true },
      'stopped',
    );

    prisma.egress.findUnique.mockResolvedValue(
      makeRow({ id: started.id, status: 'ended', endedReason: 'stopped' }),
    );
    await expect(service.stop('project-1', started.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('ends the session when the room closes', async () => {
    await service.start('project-1', 'room-1', {
      rtmpEndpoints: [],
      hls: true,
    });
    const roomClosed = sfu.onRoomClosed.mock.calls[0][1] as () => void;
    roomClosed();
    await flush();
    expect(prisma.egress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ended',
          endedReason: 'roomEnded',
        }),
      }),
    );
    expect(webhooks.egressStopped).toHaveBeenCalledWith(
      'room-1',
      'room-slug',
      expect.any(String),
      { rtmpEndpoints: [], hls: true },
      'room-ended',
    );
  });

  it('hides other projects sessions behind 404', async () => {
    prisma.egress.findUnique.mockResolvedValue(
      makeRow({ projectId: 'other-project' }),
    );
    await expect(service.get('project-1', 'egress-x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
