import type { Request, Response, NextFunction } from 'express';
import * as meetingsService from './meetings.service.js';
import type { CreateMeetingInput, ListMeetingsQuery } from './meetings.schema.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.createMeeting(req.user!.id, req.body as CreateMeetingInput);
    res.status(201).json({ meeting });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await meetingsService.listMeetings(req.user!.id, req.query as unknown as ListMeetingsQuery);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await meetingsService.getMeeting(req.params.id as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const meeting = await meetingsService.getMeetingByCode(req.params.code as string);
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
}

export async function join(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await meetingsService.joinMeeting(req.params.id as string, req.user!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function leave(req: Request, res: Response, next: NextFunction) {
  try {
    await meetingsService.leaveMeeting(req.params.id as string, req.user!.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
}

export async function end(req: Request, res: Response, next: NextFunction) {
  try {
    await meetingsService.endMeeting(req.params.id as string, req.user!.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
}
