jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoomService } from './room.service';
import { PrismaService } from 'src/prisma/prisma.service';
describe('RoomService', () => {
  let service: RoomService;
  let prisma: {
    $transaction: jest.Mock;
    room: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    callRecord: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
      room: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      callRecord: {
        create: jest.fn().mockResolvedValue({ id: 'record-1' }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [RoomService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(RoomService);
  });

  describe('ownership kinds', () => {
    it('creates user-owned rooms with ownerId and no projectId', async () => {
      prisma.room.create.mockResolvedValue({ id: 'room-1' });

      await service.createRoom('user-1', { maxParticipants: 5 });

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ownerId: 'user-1',
          maxParticipants: 5,
        }),
      });
      expect(
        prisma.room.create.mock.calls[0][0].data.projectId,
      ).toBeUndefined();
    });

    it('creates project-owned rooms with projectId and no ownerId', async () => {
      prisma.room.create.mockResolvedValue({ id: 'room-2' });

      await service.createProjectRoom('project-1', {});

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'project-1',
          maxParticipants: 10,
        }),
      });
      expect(prisma.room.create.mock.calls[0][0].data.ownerId).toBeUndefined();
    });
  });

  describe('findProjectRoom', () => {
    it('returns the room when the project matches', async () => {
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1' });

      await expect(
        service.findProjectRoom('room-1', 'project-1'),
      ).resolves.toEqual({ id: 'room-1' });

      expect(prisma.room.findFirst).toHaveBeenCalledWith({
        where: { id: 'room-1', projectId: 'project-1' },
      });
    });

    it('throws NotFound when the room belongs to another project', async () => {
      prisma.room.findFirst.mockResolvedValue(null);

      await expect(
        service.findProjectRoom('room-1', 'project-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDeleteRoom', () => {
    function aRoom(overrides: Record<string, unknown> = {}) {
      return {
        id: 'room-1',
        name: 'Standup',
        slug: 'abc123',
        ownerId: 'user-1',
        projectId: null,
        createdAt: new Date('2026-09-07T10:00:00Z'),
        messages: [],
        ...overrides,
      };
    }

    it('marks the room ended with an endedAt timestamp', async () => {
      prisma.room.findUnique.mockResolvedValue(aRoom());
      prisma.room.update.mockResolvedValue({ id: 'room-1', status: 'ended' });

      await service.softDeleteRoom('room-1');

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'ended', endedAt: expect.any(Date) },
      });
    });

    it('snapshots the call into the owner history with labeled messages', async () => {
      prisma.room.findUnique.mockResolvedValue(
        aRoom({
          messages: [
            {
              content: 'hello',
              createdAt: new Date('2026-09-07T10:01:00Z'),
              user: { username: 'alice' },
            },
            {
              content: 'hi from guest',
              createdAt: new Date('2026-09-07T10:02:00Z'),
              user: null,
            },
          ],
        }),
      );
      prisma.room.update.mockResolvedValue({ id: 'room-1', status: 'ended' });

      await service.softDeleteRoom('room-1');

      expect(prisma.callRecord.create).toHaveBeenCalledWith({
        data: {
          ownerId: 'user-1',
          roomName: 'Standup',
          roomSlug: 'abc123',
          startedAt: new Date('2026-09-07T10:00:00Z'),
          endedAt: expect.any(Date),
          messageCount: 2,
          messages: [
            {
              author: 'alice',
              content: 'hello',
              createdAt: '2026-09-07T10:01:00.000Z',
            },
            {
              author: 'Guest',
              content: 'hi from guest',
              createdAt: '2026-09-07T10:02:00.000Z',
            },
          ],
        },
      });
    });

    it('falls back to the room slug as the record name', async () => {
      prisma.room.findUnique.mockResolvedValue(aRoom({ name: null }));
      prisma.room.update.mockResolvedValue({ id: 'room-1', status: 'ended' });

      await service.softDeleteRoom('room-1');

      expect(prisma.callRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ roomName: 'abc123' }),
        }),
      );
    });

    it('skips the snapshot for project-owned rooms', async () => {
      prisma.room.findUnique.mockResolvedValue(aRoom({ ownerId: null }));
      prisma.room.update.mockResolvedValue({ id: 'room-1', status: 'ended' });

      await service.softDeleteRoom('room-1');

      expect(prisma.callRecord.create).not.toHaveBeenCalled();
    });

    it('throws NotFound and writes nothing for a missing room', async () => {
      await expect(service.softDeleteRoom('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.room.update).not.toHaveBeenCalled();
      expect(prisma.callRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('listProjectRooms', () => {
    it('scopes the query to the project', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      await service.listProjectRooms('project-1');

      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
