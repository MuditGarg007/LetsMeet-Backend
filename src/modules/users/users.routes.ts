import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { updateProfileSchema } from './users.schema.js';
import * as usersController from './users.controller.js';

const router = Router();

router.use(authenticate);

router.get('/me', usersController.getProfile);
router.patch('/me', validate(updateProfileSchema), usersController.updateProfile);

export { router as usersRouter };
