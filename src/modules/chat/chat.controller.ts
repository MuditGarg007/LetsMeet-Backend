import type { Request, Response, NextFunction } from 'express';
import * as chatService from './chat.service.js';
import type { ChatQuery } from './chat.schema.js';

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await chatService.getMessages(req.params.id as string, req.query as unknown as ChatQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
