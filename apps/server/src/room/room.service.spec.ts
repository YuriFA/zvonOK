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
    room: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      room: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
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
    it('marks the room ended with an endedAt timestamp', async () => {
      prisma.room.update.mockResolvedValue({ id: 'room-1', status: 'ended' });

      await service.softDeleteRoom('room-1');

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { status: 'ended', endedAt: expect.any(Date) },
      });
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
