import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketManager } from '../manager';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: {
      on: vi.fn(),
      off: vi.fn(),
    },
  })),
}));

describe('WebSocketManager', () => {
  let manager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WebSocketManager();
  });

  afterEach(() => {
    manager.disconnect();
  });

  describe('connection lifecycle', () => {
    it('should have initial status as disconnected', () => {
      expect(manager.getStatus()).toBe('disconnected');
    });

    it('should not be connected initially', () => {
      expect(manager.isConnected()).toBe(false);
    });

    it('should set status to connecting when connect is called', () => {
      manager.connect();

      expect(manager.getStatus()).toBe('connecting');
    });

    it('should disconnect socket and reset state on disconnect()', () => {
      manager.connect();

      manager.disconnect();

      expect(manager.getStatus()).toBe('disconnected');
      expect(manager.isConnected()).toBe(false);
      expect(manager.getCurrentRoom()).toBeNull();
    });

    it('should handle disconnect when socket is null', () => {
      // Should not throw
      expect(() => manager.disconnect()).not.toThrow();
    });
  });

  describe('status callbacks', () => {
    it('should register and call status change callback', () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);

      // Callback is called immediately with current status
      expect(callback).toHaveBeenCalledWith('disconnected');
    });

    it('should call callback on status change', () => {
      const callback = vi.fn();
      manager.onStatusChange(callback);
      callback.mockClear();

      manager.connect();

      expect(callback).toHaveBeenCalledWith('connecting');
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = manager.onStatusChange(callback);
      callback.mockClear();

      unsubscribe();
      manager.connect();

      // Should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.onStatusChange(callback1);
      manager.onStatusChange(callback2);
      callback1.mockClear();
      callback2.mockClear();

      manager.connect();

      expect(callback1).toHaveBeenCalledWith('connecting');
      expect(callback2).toHaveBeenCalledWith('connecting');
    });
  });

  describe('room management', () => {
    it('should throw error when joining room without connection', () => {
      expect(() => manager.joinRoom('ROOM123')).toThrow('Socket not connected');
    });

    it('should return null from getCurrentRoom initially', () => {
      expect(manager.getCurrentRoom()).toBeNull();
    });

    it('should handle leaveRoom when socket is null', () => {
      manager.disconnect();

      // Should not throw
      expect(() => manager.leaveRoom()).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should throw error when emitting without connection', () => {
      expect(() =>
        manager.emit('webrtc:offer', {
          targetPeerId: 'peer1',
          offer: { type: 'offer', sdp: 'test' },
        })
      ).toThrow('Socket not connected');
    });

    it('should not register handler when socket is null', () => {
      const handler = vi.fn();
      // Socket is null initially
      manager.on('room:joined', handler);
      // Should not throw
    });

    it('should not call off when socket is null', () => {
      const handler = vi.fn();
      // Socket is null initially
      manager.off('room:joined', handler);
      // Should not throw
    });

    it('should not call once when socket is null', () => {
      const handler = vi.fn();
      // Socket is null initially
      manager.once('room:joined', handler);
      // Should not throw
    });
  });

  describe('getters', () => {
    it('should return null from getSocket() when disconnected', () => {
      manager.disconnect();

      expect(manager.getSocket()).toBeNull();
    });

    it('should return false from isConnected() when socket is null', () => {
      manager.disconnect();

      expect(manager.isConnected()).toBe(false);
    });

    it('should return current status from getStatus()', () => {
      expect(manager.getStatus()).toBe('disconnected');
    });
  });
});
