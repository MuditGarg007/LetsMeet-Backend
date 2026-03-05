import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  scheduledAt: z.string().datetime().optional(),
  maxParticipants: z.number().int().min(2).max(100).optional(),
  settings: z.object({
    muteOnJoin: z.boolean().optional(),
    waitingRoom: z.boolean().optional(),
  }).optional(),
});

export const meetingIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const meetingCodeParamSchema = z.object({
  code: z.string().min(1),
});

export const listMeetingsQuerySchema = z.object({
  status: z.enum(['waiting', 'active', 'ended']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>;
