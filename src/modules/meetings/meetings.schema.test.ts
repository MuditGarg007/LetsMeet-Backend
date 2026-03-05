import { describe, it, expect } from 'vitest';
import { createMeetingSchema, listMeetingsQuerySchema } from './meetings.schema.js';

describe('meetings validation schemas', () => {
  describe('createMeetingSchema', () => {
    it('should accept empty body (all fields optional)', () => {
      const result = createMeetingSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid input with all fields', () => {
      const result = createMeetingSchema.safeParse({
        title: 'Team Standup',
        scheduledAt: '2026-03-10T10:00:00.000Z',
        maxParticipants: 20,
        settings: { muteOnJoin: true, waitingRoom: false },
      });
      expect(result.success).toBe(true);
    });

    it('should reject maxParticipants > 100', () => {
      const result = createMeetingSchema.safeParse({
        maxParticipants: 200,
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxParticipants < 2', () => {
      const result = createMeetingSchema.safeParse({
        maxParticipants: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid scheduledAt format', () => {
      const result = createMeetingSchema.safeParse({
        scheduledAt: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listMeetingsQuerySchema', () => {
    it('should apply defaults for missing fields', () => {
      const result = listMeetingsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept valid status filter', () => {
      const result = listMeetingsQuerySchema.safeParse({ status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = listMeetingsQuerySchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should coerce string page to number', () => {
      const result = listMeetingsQuerySchema.safeParse({ page: '3' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });
  });
});
