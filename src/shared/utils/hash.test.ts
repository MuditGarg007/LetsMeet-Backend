import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './hash.js';

describe('password hashing', () => {
  const password = 'SecureP@ss123';

  it('should hash a password', async () => {
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify a correct password', async () => {
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await hashPassword(password);
    const result = await verifyPassword('WrongPassword1', hash);
    expect(result).toBe(false);
  });

  it('should generate different hashes for the same password', async () => {
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
