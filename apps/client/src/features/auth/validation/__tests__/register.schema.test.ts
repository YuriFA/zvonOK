import { describe, it, expect } from 'vitest';
import { registerSchema } from '../register.schema';

describe('registerSchema', () => {
  describe('valid inputs', () => {
    it('should pass with valid registration data', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(true);
    });

    it('should pass with username containing underscores', () => {
      const result = registerSchema.safeParse({
        username: 'test_user_123',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('username validation', () => {
    it('should fail with empty username', () => {
      const result = registerSchema.safeParse({
        username: '',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Username is required')).toBe(true);
      }
    });

    it('should fail with username shorter than 3 characters', () => {
      const result = registerSchema.safeParse({
        username: 'ab',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Username must be at least 3 characters')).toBe(true);
      }
    });

    it('should fail with username longer than 20 characters', () => {
      const result = registerSchema.safeParse({
        username: 'a'.repeat(21),
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Username must not exceed 20 characters')).toBe(true);
      }
    });

    it('should pass with exactly 3 characters', () => {
      const result = registerSchema.safeParse({
        username: 'abc',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(true);
    });

    it('should pass with exactly 20 characters', () => {
      const result = registerSchema.safeParse({
        username: 'a'.repeat(20),
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(true);
    });

    it('should fail with special characters in username', () => {
      const result = registerSchema.safeParse({
        username: 'test-user',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Username can only contain letters, numbers, and underscores')).toBe(true);
      }
    });

    it('should fail with spaces in username', () => {
      const result = registerSchema.safeParse({
        username: 'test user',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('email validation', () => {
    it('should fail with empty email', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: '',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
    });

    it('should fail with invalid email format', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password1',
        confirmPassword: 'Password1',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should fail with empty password', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: '',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
    });

    it('should fail with password shorter than 6 characters', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Pas1',
        confirmPassword: 'Pas1',
      });

      expect(result.success).toBe(false);
    });

    it('should fail with password longer than 16 characters', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Password123456789',  // 17 characters
        confirmPassword: 'Password123456789',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Password must not exceed 16 characters')).toBe(true);
      }
    });

    it('should fail without uppercase letter', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'password1',
        confirmPassword: 'password1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Password must contain at least one uppercase, one lowercase, and one number')).toBe(true);
      }
    });

    it('should fail without lowercase letter', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'PASSWORD1',
        confirmPassword: 'PASSWORD1',
      });

      expect(result.success).toBe(false);
    });

    it('should fail without number', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Password',
        confirmPassword: 'Password',
      });

      expect(result.success).toBe(false);
    });

    it('should fail with spaces in password', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Pass word1',
        confirmPassword: 'Pass word1',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Password must not contain spaces')).toBe(true);
      }
    });
  });

  describe('confirmPassword validation', () => {
    it('should fail when passwords do not match', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: 'Password2',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === "Passwords don't match")).toBe(true);
      }
    });

    it('should fail with empty confirmPassword', () => {
      const result = registerSchema.safeParse({
        username: 'testuser',
        email: 'user@example.com',
        password: 'Password1',
        confirmPassword: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Please confirm your password')).toBe(true);
      }
    });
  });
});
