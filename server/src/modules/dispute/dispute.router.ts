import { Router } from 'express';
import {
  handleGetDisputeById,
  handleSubmitEvidence,
  handleGetEvidences,
  handleGetEvidenceFile,
  handleGetEvidenceSignedUrl,
  handleSubmitExplanation,
} from './dispute.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { submitEvidenceSchema, companionExplanationSchema } from './dispute.dto.js';

export const disputeRouter = Router();

// Yêu cầu xác thực JWT cho tất cả routes dispute (hỗ trợ Header Bearer và query ?signed_token=, chặn ?token=)
disputeRouter.use(authenticate);

disputeRouter.get('/:id', asyncHandler(handleGetDisputeById));
disputeRouter.post('/:id/evidences', validateBody(submitEvidenceSchema), asyncHandler(handleSubmitEvidence));
disputeRouter.get('/:id/evidences', asyncHandler(handleGetEvidences));
disputeRouter.get('/:id/evidences/:evidenceId/signed-url', asyncHandler(handleGetEvidenceSignedUrl));
disputeRouter.get('/:id/evidences/:evidenceId/file', asyncHandler(handleGetEvidenceFile));
disputeRouter.post('/:id/explanation', validateBody(companionExplanationSchema), asyncHandler(handleSubmitExplanation));
