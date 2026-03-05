import { describe, it, expect } from 'vitest';
import { generateMeetingCode } from './meeting-code.js';

describe('generateMeetingCode', () => {
  it('should generate a code in xxx-xxxx-xxx format', () => {
    const code = generateMeetingCode();
    expect(code).toMatch(/^[a-z2-9]{3}-[a-z2-9]{4}-[a-z2-9]{3}$/);
  });

  it('should generate unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateMeetingCode()));
    expect(codes.size).toBe(100);
  });

  it('should not contain ambiguous characters (0, 1, l, o)', () => {
    const codes = Array.from({ length: 50 }, () => generateMeetingCode());
    for (const code of codes) {
      const raw = code.replace(/-/g, '');
      expect(raw).not.toMatch(/[01lo]/);
    }
  });

  it('should be exactly 12 characters (including dashes)', () => {
    const code = generateMeetingCode();
    expect(code.length).toBe(12);
  });
});
