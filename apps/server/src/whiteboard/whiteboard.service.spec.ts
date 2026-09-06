jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { WhiteboardService } from './whiteboard.service';
import { SfuService } from 'src/sfu/sfu.service';

describe('WhiteboardService', () => {
  let service: WhiteboardService;
  let roomClosedHandler: () => void;
  let unsubscribe: jest.Mock;
  const sfu = {
    onRoomClosed: jest.fn((_roomId: string, handler: () => void) => {
      roomClosedHandler = handler;
      return unsubscribe;
    }),
  } as unknown as SfuService;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribe = jest.fn();
    service = new WhiteboardService(sfu);
  });

  describe('getBoard', () => {
    it('returns an empty owner-only board for unknown rooms', () => {
      expect(service.getBoard('room-1')).toEqual({
        snapshot: '{}',
        mode: 'owner',
      });
    });
  });

  describe('putSnapshot', () => {
    it('stores and returns the snapshot, creating the board lazily', () => {
      const result = service.putSnapshot('room-1', '{"a":1}');
      expect(result).toBe('{"a":1}');
      expect(service.getBoard('room-1').snapshot).toBe('{"a":1}');
      expect(sfu.onRoomClosed).toHaveBeenCalledWith(
        'room-1',
        expect.any(Function),
      );
    });

    it('rejects empty and oversized payloads without creating a board', () => {
      expect(service.putSnapshot('room-1', '')).toBeNull();
      expect(
        service.putSnapshot('room-1', 'x'.repeat(4 * 1024 * 1024 + 1)),
      ).toBeNull();
      expect(sfu.onRoomClosed).not.toHaveBeenCalled();
      expect(service.getBoard('room-1').snapshot).toBe('{}');
    });

    it('replaces the previous snapshot', () => {
      service.putSnapshot('room-1', '{"a":1}');
      service.putSnapshot('room-1', '{"a":1,"b":2}');
      expect(service.getBoard('room-1').snapshot).toBe('{"a":1,"b":2}');
    });
  });

  describe('setMode', () => {
    it('defaults to owner-only and persists changes', () => {
      expect(service.getBoard('room-1').mode).toBe('owner');
      expect(service.setMode('room-1', 'open')).toBe('open');
      expect(service.getBoard('room-1').mode).toBe('open');
    });
  });

  describe('room teardown', () => {
    it('drops the board when the room closes', () => {
      service.putSnapshot('room-1', '{"a":1}');
      roomClosedHandler();
      expect(service.getBoard('room-1').snapshot).toBe('{}');
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('dropBoard unsubscribes and removes state', () => {
      service.putSnapshot('room-1', '{"a":1}');
      service.dropBoard('room-1');
      expect(unsubscribe).toHaveBeenCalled();
      expect(service.getBoard('room-1').snapshot).toBe('{}');
    });

    it('dropAll clears every board', () => {
      service.putSnapshot('room-1', '{"a":1}');
      service.putSnapshot('room-2', '{"b":2}');
      service.dropAll();
      expect(service.getBoard('room-1').snapshot).toBe('{}');
      expect(service.getBoard('room-2').snapshot).toBe('{}');
    });
  });
});
