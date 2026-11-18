import { Router } from 'express';
import {
  handleGetProfile,
  handleUpdateProfile,
  handleUploadAvatar,
  handleDeleteAvatar,
  handleChangePassword,
} from './profile.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { updateProfileSchema, changePasswordSchema } from './profile.dto.js';

export const profileRouter = Router();

// Toàn bộ routes yêu cầu đăng nhập
profileRouter.use(authenticate);

profileRouter.get('/profile', asyncHandler(handleGetProfile));
profileRouter.patch('/profile', validateBody(updateProfileSchema), asyncHandler(handleUpdateProfile));
profileRouter.post('/avatar', asyncHandler(handleUploadAvatar));
profileRouter.delete('/avatar', asyncHandler(handleDeleteAvatar));
profileRouter.post('/change-password', validateBody(changePasswordSchema), asyncHandler(handleChangePassword));
