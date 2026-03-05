import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth.schema.js';

describe('auth validation schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid input', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP1ass',
        displayName: 'John Doe',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'SecureP1ass',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'Short1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'alllowercase1',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'NoNumberHere',
        displayName: 'John',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short display name', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP1ass',
        displayName: 'J',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid input', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'anything',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });
  });
});
