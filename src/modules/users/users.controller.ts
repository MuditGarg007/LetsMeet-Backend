import type { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service.js';
import type { UpdateProfileInput } from './users.schema.js';

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getProfile(req.user!.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}
