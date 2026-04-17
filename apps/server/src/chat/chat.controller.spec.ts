jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotFoundException } from '@nestjs/common';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;

  const userPayload = {
    id: 'user-1',
    email: 'john@example.com',
    role: 'USER' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {
            sendMessage: jest.fn(),
            getMessages: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('delegates to service with user id', async () => {
      const message = {
        id: 'msg-1',
        content: 'Hello!',
        userId: 'user-1',
        roomId: 'room-1',
        createdAt: new Date(),
        user: { id: 'user-1', username: 'john' },
      };
      chatService.sendMessage.mockResolvedValue(message as never);

      const result = await controller.sendMessage(userPayload, {
        content: 'Hello!',
        roomId: 'room-1',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith('user-1', {
        content: 'Hello!',
        roomId: 'room-1',
      });
      expect(result).toEqual(message);
    });

    it('propagates NotFoundException from service', async () => {
      chatService.sendMessage.mockRejectedValue(
        new NotFoundException('Room not found'),
      );

      await expect(
        controller.sendMessage(userPayload, {
          content: 'Hello!',
          roomId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessages', () => {
    it('calls service with parsed query params', async () => {
      chatService.getMessages.mockResolvedValue({
        data: [],
        meta: { page: 2, limit: 25, total: 0, totalPages: 0 },
      } as never);

      await controller.getMessages('room-1', '2', '25');

      expect(chatService.getMessages).toHaveBeenCalledWith('room-1', 2, 25);
    });

    it('uses defaults when no query params provided', async () => {
      chatService.getMessages.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      } as never);

      await controller.getMessages('room-1');

      expect(chatService.getMessages).toHaveBeenCalledWith('room-1', 1, 50);
    });

    it('clamps limit to max 100', async () => {
      chatService.getMessages.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
      } as never);

      await controller.getMessages('room-1', '1', '500');

      expect(chatService.getMessages).toHaveBeenCalledWith('room-1', 1, 100);
    });

    it('clamps page to minimum 1', async () => {
      chatService.getMessages.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
      } as never);

      await controller.getMessages('room-1', '-1');

      expect(chatService.getMessages).toHaveBeenCalledWith('room-1', 1, 50);
    });

    it('clamps limit to minimum 1', async () => {
      chatService.getMessages.mockResolvedValue({
        data: [],
        meta: { page: 1, limit: 1, total: 0, totalPages: 0 },
      } as never);

      await controller.getMessages('room-1', '1', '0');

      expect(chatService.getMessages).toHaveBeenCalledWith('room-1', 1, 1);
    });

    it('propagates NotFoundException from service', async () => {
      chatService.getMessages.mockRejectedValue(
        new NotFoundException('Room not found'),
      );

      await expect(controller.getMessages('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
