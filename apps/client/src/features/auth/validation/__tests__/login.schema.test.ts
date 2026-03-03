import { describe, it, expect } from 'vitest';
import { loginSchema } from '../login.schema';

describe('loginSchema', () => {
  describe('valid inputs', () => {
    it('should pass with valid email and password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should pass with complex email', () => {
      const result = loginSchema.safeParse({
        email: 'user.name+tag@subdomain.example.com',
        password: 'mypass',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should fail with empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('should fail with invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Invalid email address')).toBe(true);
      }
    });

    it('should fail with email missing @', () => {
      const result = loginSchema.safeParse({
        email: 'userexample.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should fail with email missing domain', () => {
      const result = loginSchema.safeParse({
        email: 'user@',
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should fail with empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('should fail with password shorter than 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '12345',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.message === 'Password must be at least 6 characters')).toBe(true);
      }
    });

    it('should pass with exactly 6 characters', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '123456',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('missing fields', () => {
    it('should fail when email is missing', () => {
      const result = loginSchema.safeParse({
        password: 'password123',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when password is missing', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });

      expect(result.success).toBe(false);
    });

    it('should fail when both fields are missing', () => {
      const result = loginSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});
