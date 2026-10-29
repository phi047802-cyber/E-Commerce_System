import { Router } from 'express';
import { 
  handleGetMyProfile, 
  handleGetTrustScore,
  handleUpdateMyProfile, 
  handleGetMySlots, 
  handleCreateSlot, 
  handleDeleteSlot 
} from './companion.controller.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { updateProfileSchema, createSlotSchema } from './companion.dto.js';

export const companionRouter = Router();

// Toàn bộ route trong module này yêu cầu vai trò COMPANION
companionRouter.use(authenticate, authorizeRoles('COMPANION'));

companionRouter.get('/profile', asyncHandler(handleGetMyProfile));
companionRouter.get('/trust-score', asyncHandler(handleGetTrustScore));
companionRouter.put('/profile', validateBody(updateProfileSchema), asyncHandler(handleUpdateMyProfile));
companionRouter.get('/slots', asyncHandler(handleGetMySlots));
companionRouter.post('/slots', validateBody(createSlotSchema), asyncHandler(handleCreateSlot));
companionRouter.delete('/slots/:id', asyncHandler(handleDeleteSlot));
