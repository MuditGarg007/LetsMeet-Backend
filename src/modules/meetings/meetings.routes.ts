import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { createMeetingSchema, meetingIdParamSchema, meetingCodeParamSchema, listMeetingsQuerySchema } from './meetings.schema.js';
import * as meetingsController from './meetings.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createMeetingSchema), meetingsController.create);
router.get('/', validate(listMeetingsQuerySchema, 'query'), meetingsController.list);
router.get('/join/:code', validate(meetingCodeParamSchema, 'params'), meetingsController.getByCode);
router.get('/:id', validate(meetingIdParamSchema, 'params'), meetingsController.get);
router.post('/:id/join', validate(meetingIdParamSchema, 'params'), meetingsController.join);
router.post('/:id/leave', validate(meetingIdParamSchema, 'params'), meetingsController.leave);
router.post('/:id/end', validate(meetingIdParamSchema, 'params'), meetingsController.end);

export { router as meetingsRouter };
