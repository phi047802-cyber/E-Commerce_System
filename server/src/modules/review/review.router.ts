import { Router } from 'express';
import {
  handleCreateReview,
  handleGetBookingReviews,
  handleGetCompanionReviews,
} from './review.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { createReviewSchema } from './review.dto.js';

export const reviewRouter = Router();

// Gửi đánh giá yêu cầu đăng nhập
reviewRouter.post(
  '/',
  authenticate,
  validateBody(createReviewSchema),
  asyncHandler(handleCreateReview)
);

// Tra cứu đánh giá công khai
reviewRouter.get('/booking/:bookingId', asyncHandler(handleGetBookingReviews));
reviewRouter.get('/companion/:profileId', asyncHandler(handleGetCompanionReviews));
