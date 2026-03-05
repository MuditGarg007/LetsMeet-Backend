import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { chatParamsSchema, chatQuerySchema } from './chat.schema.js';
import * as chatController from './chat.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:id/chat', validate(chatParamsSchema, 'params'), validate(chatQuerySchema, 'query'), chatController.getMessages);

export { router as chatRouter };
