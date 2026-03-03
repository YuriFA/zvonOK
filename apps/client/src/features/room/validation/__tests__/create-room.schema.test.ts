import { describe, it, expect } from 'vitest';
import { createRoomSchema } from '../create-room.schema';

describe('createRoomSchema', () => {
  describe('valid inputs', () => {
    it('should pass with empty object (all fields optional)', () => {
      const result = createRoomSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('should pass with valid name only', () => {
      const result = createRoomSchema.safeParse({
        name: 'My Room',
      });

      expect(result.success).toBe(true);
    });

    it('should pass with valid maxParticipants only', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 10,
      });

      expect(result.success).toBe(true);
    });

    it('should pass with both fields', () => {
      const result = createRoomSchema.safeParse({
        name: 'My Room',
        maxParticipants: 5,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('name validation', () => {
    it('should pass with empty string name', () => {
      const result = createRoomSchema.safeParse({
        name: '',
      });

      expect(result.success).toBe(true);
    });

    it('should pass with name at max length (100 characters)', () => {
      const result = createRoomSchema.safeParse({
        name: 'a'.repeat(100),
      });

      expect(result.success).toBe(true);
    });

    it('should fail with name exceeding max length', () => {
      const result = createRoomSchema.safeParse({
        name: 'a'.repeat(101),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Room name must be at most 100 characters');
      }
    });
  });

  describe('maxParticipants validation', () => {
    it('should pass with minimum value (2)', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 2,
      });

      expect(result.success).toBe(true);
    });

    it('should pass with maximum value (50)', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 50,
      });

      expect(result.success).toBe(true);
    });

    it('should fail with value below minimum (1)', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Minimum 2 participants required');
      }
    });

    it('should fail with value above maximum (51)', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 51,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Maximum 50 participants allowed');
      }
    });

    it('should fail with negative value', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: -1,
      });

      expect(result.success).toBe(false);
    });

    it('should fail with zero', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: 0,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should fail when name is not a string', () => {
      const result = createRoomSchema.safeParse({
        name: 123,
      });

      expect(result.success).toBe(false);
    });

    it('should fail when maxParticipants is not a number', () => {
      const result = createRoomSchema.safeParse({
        maxParticipants: '10',
      });

      expect(result.success).toBe(false);
    });
  });
});
