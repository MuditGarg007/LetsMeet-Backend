import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.stubEnv('JWT_ACCESS_SECRET', 'test-access-secret-that-is-32-chars-long!');
vi.stubEnv('JWT_REFRESH_SECRET', 'test-refresh-secret-that-is-32-chars-lo!');
vi.stubEnv('JWT_ACCESS_EXPIRES_IN', '15m');
vi.stubEnv('JWT_REFRESH_EXPIRES_IN', '7d');

const { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } = await import('./jwt.js');

describe('JWT utilities', () => {
  describe('access tokens', () => {
    it('should sign and verify an access token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = signAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should reject a tampered token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = signAccessToken(payload);

      expect(() => verifyAccessToken(token + 'tampered')).toThrow();
    });

    it('should reject an expired token', () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'test@example.com' },
        'test-access-secret-that-is-32-chars-long!',
        { expiresIn: '0s' }
      );

      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('should sign and verify a refresh token', () => {
      const payload = { sub: 'user-123', jti: 'token-id-456' };
      const token = signRefreshToken(payload);

      expect(token).toBeDefined();

      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe('user-123');
      expect(decoded.jti).toBe('token-id-456');
    });

    it('should not verify refresh token with access secret', () => {
      const payload = { sub: 'user-123', jti: 'token-id-456' };
      const token = signRefreshToken(payload);

      expect(() => verifyAccessToken(token)).toThrow();
    });
  });
});
