import { Router } from 'express';
import {
  handleGetDisputeById,
  handleSubmitEvidence,
  handleGetEvidences,
} from './dispute.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { submitEvidenceSchema } from './dispute.dto.js';

export const disputeRouter = Router();

// Yêu cầu xác thực JWT cho tất cả routes dispute
disputeRouter.use(authenticate);

disputeRouter.get('/:id', asyncHandler(handleGetDisputeById));
disputeRouter.post('/:id/evidences', validateBody(submitEvidenceSchema), asyncHandler(handleSubmitEvidence));
disputeRouter.get('/:id/evidences', asyncHandler(handleGetEvidences));
