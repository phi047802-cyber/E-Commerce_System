import { Router } from 'express';
import { 
  handleCreateBooking, 
  handleGetBookingById, 
  handleListMyBookings,
  handleHoldEscrow,
  handleAcceptBooking,
  handleRejectBooking,
  handleTimeoutBooking,
  handleCancelBooking,
  handleAcceptFulfillment,
  handleAutoAccept,
  handleReportIssue,
  handleGetDispute,
} from './booking.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { 
  createBookingSchema, 
  rejectBookingSchema, 
  cancelBookingSchema 
} from './booking.dto.js';
import { reportIssueSchema } from '../session/session.dto.js';

export const bookingRouter = Router();

// Toàn bộ API booking yêu cầu xác thực JWT
bookingRouter.use(authenticate);

bookingRouter.post('/', validateBody(createBookingSchema), asyncHandler(handleCreateBooking));
bookingRouter.get('/', asyncHandler(handleListMyBookings));
bookingRouter.get('/:id', asyncHandler(handleGetBookingById));
bookingRouter.post('/:id/hold-escrow', asyncHandler(handleHoldEscrow));
bookingRouter.post('/:id/accept', asyncHandler(handleAcceptBooking));
bookingRouter.post('/:id/reject', validateBody(rejectBookingSchema), asyncHandler(handleRejectBooking));
bookingRouter.post('/:id/timeout', asyncHandler(handleTimeoutBooking));
bookingRouter.post('/:id/cancel', validateBody(cancelBookingSchema), asyncHandler(handleCancelBooking));
bookingRouter.post('/:id/accept-fulfillment', asyncHandler(handleAcceptFulfillment));
bookingRouter.post('/:id/auto-accept', asyncHandler(handleAutoAccept));
bookingRouter.post('/:id/report-issue', validateBody(reportIssueSchema), asyncHandler(handleReportIssue));
bookingRouter.get('/:id/dispute', asyncHandler(handleGetDispute));

