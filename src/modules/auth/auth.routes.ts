import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { authLimiter } from '../../shared/middleware/rate-limiter.js';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';

const router = Router();

router.use(authLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, validate(logoutSchema), authController.logout);

export { router as authRouter };
