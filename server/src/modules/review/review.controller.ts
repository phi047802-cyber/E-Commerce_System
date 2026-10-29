import { Request, Response } from 'express';
import { reviewService } from './review.service.js';
import { sendSuccess } from '../../common/response.js';

export const handleCreateReview = async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const input = req.body;

  const result = await reviewService.createReview(userId, input);
  sendSuccess(res, result, 201);
};

export const handleGetBookingReviews = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const reviews = await reviewService.getReviewsForBooking(bookingId);
  sendSuccess(res, reviews);
};

export const handleGetCompanionReviews = async (req: Request, res: Response) => {
  const { profileId } = req.params;
  const data = await reviewService.getReviewsForCompanion(profileId);
  sendSuccess(res, data);
};
