import { describe, it, expect } from 'vitest';
import { roomKeys } from '../query-keys';

describe('roomKeys', () => {
  describe('all', () => {
    it('should return ["rooms"]', () => {
      expect(roomKeys.all).toEqual(['rooms']);
    });
  });

  describe('details', () => {
    it('should return ["rooms", "detail"]', () => {
      expect(roomKeys.details()).toEqual(['rooms', 'detail']);
    });
  });

  describe('detail', () => {
    it('should return ["rooms", "detail", slug]', () => {
      expect(roomKeys.detail('room-123')).toEqual(['rooms', 'detail', 'room-123']);
    });

    it('should include different slugs', () => {
      expect(roomKeys.detail('abc')).toEqual(['rooms', 'detail', 'abc']);
      expect(roomKeys.detail('xyz')).toEqual(['rooms', 'detail', 'xyz']);
    });
  });

  describe('hierarchy', () => {
    it('should maintain proper key hierarchy', () => {
      const all = roomKeys.all;
      const details = roomKeys.details();
      const detail = roomKeys.detail('test');

      // detail should start with details prefix
      expect(detail.slice(0, 2)).toEqual(details);

      // details should start with all prefix
      expect(details.slice(0, 1)).toEqual(all);
    });
  });
});
