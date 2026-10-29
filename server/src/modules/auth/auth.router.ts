import { Router } from 'express';
import { handleRegister, handleLogin, handleGetMe } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { registerSchema, loginSchema } from './auth.dto.js';

export const authRouter = Router();

authRouter.post('/register', validateBody(registerSchema), asyncHandler(handleRegister));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(handleLogin));
authRouter.get('/me', authenticate, asyncHandler(handleGetMe));
