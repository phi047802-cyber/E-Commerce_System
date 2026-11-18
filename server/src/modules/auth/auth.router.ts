import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleGetDemoAccounts,
  handleForgotPassword,
  handleResetPassword,
  handleSendVerificationOtp,
  handleVerifyEmail,
  handleGoogleLogin,
  handleGoogleCompleteProfile,
} from './auth.controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendVerifyOtpSchema,
  verifyEmailSchema,
} from './auth.dto.js';

export const authRouter = Router();

authRouter.get('/demo-accounts', asyncHandler(handleGetDemoAccounts));
authRouter.post('/register', validateBody(registerSchema), asyncHandler(handleRegister));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(handleLogin));
authRouter.get('/me', authenticate, asyncHandler(handleGetMe));
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(handleForgotPassword));
authRouter.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(handleResetPassword));
authRouter.post('/send-verification-otp', validateBody(sendVerifyOtpSchema), asyncHandler(handleSendVerificationOtp));
authRouter.post('/verify-email', validateBody(verifyEmailSchema), asyncHandler(handleVerifyEmail));

// Google OAuth2 Authentication (FR-001)
authRouter.post('/google', asyncHandler(handleGoogleLogin));
authRouter.post('/google/complete-profile', authenticate, asyncHandler(handleGoogleCompleteProfile));

