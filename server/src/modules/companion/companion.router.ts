import { Router, Request, Response, NextFunction } from 'express';
import { 
  handleGetMyProfile, 
  handleGetTrustScore,
  handleUpdateMyProfile, 
  handleGetMySlots, 
  handleCreateSlot, 
  handleDeleteSlot,
  handleUploadVoiceIntro
} from './companion.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { updateProfileSchema, createSlotSchema, uploadVoiceIntroSchema } from './companion.dto.js';

export const companionRouter = Router();

// Middleware kiểm tra Content-Length trước khi đọc toàn bộ payload
const checkVoiceContentLength = (req: Request, res: Response, next: NextFunction) => {
  const cl = req.headers['content-length'];
  if (cl && parseInt(cl, 10) > 3 * 1024 * 1024) {
    return res.status(400).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Dung lượng yêu cầu tải lên vượt quá giới hạn cho phép (3MB).',
      },
    });
  }
  next();
};

// Toàn bộ route trong module này yêu cầu vai trò COMPANION
companionRouter.use(authenticate, authorizeRoles('COMPANION'));

companionRouter.get('/profile', asyncHandler(handleGetMyProfile));
companionRouter.get('/trust-score', asyncHandler(handleGetTrustScore));
companionRouter.put('/profile', validateBody(updateProfileSchema), asyncHandler(handleUpdateMyProfile));
companionRouter.post(
  '/profile/voice',
  checkVoiceContentLength,
  validateBody(uploadVoiceIntroSchema),
  asyncHandler(handleUploadVoiceIntro)
);
companionRouter.get('/slots', asyncHandler(handleGetMySlots));
companionRouter.post('/slots', validateBody(createSlotSchema), asyncHandler(handleCreateSlot));
companionRouter.delete('/slots/:id', asyncHandler(handleDeleteSlot));
