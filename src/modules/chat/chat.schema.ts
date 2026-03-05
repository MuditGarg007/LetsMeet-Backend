import { z } from 'zod';

export const chatParamsSchema = z.object({
  id: z.string().uuid(),
});

export const chatQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ChatQuery = z.infer<typeof chatQuerySchema>;
