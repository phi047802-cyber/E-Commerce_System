import { Request, Response } from 'express';
import { bookingService } from './booking.service.js';
import { sendSuccess } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';

export async function handleCreateBooking(req: Request, res: Response): Promise<void> {
  const renterId = req.user!.user_id;

  // Hỗ trợ request_key từ request body hoặc từ HTTP headers Idempotency-Key / X-Request-Key
  const requestKey =
    req.body.request_key ||
    (req.headers['idempotency-key'] as string) ||
    (req.headers['x-request-key'] as string);

  if (!requestKey) {
    throw new ValidationError('request_key (hoặc header Idempotency-Key) là bắt buộc để chống đặt trùng.');
  }

  const input = {
    ...req.body,
    request_key: requestKey,
  };

  const result = await bookingService.createBooking(renterId, input);

  // Nếu là idempotent replay trả về 200, nếu tạo mới trả về 201
  const statusCode = result.is_idempotent_replay ? 200 : 201;

  sendSuccess(res, result.booking, statusCode, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleGetBookingById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const booking = await bookingService.getBookingById(userId, userRole, id);
  sendSuccess(res, booking);
}

export async function handleListMyBookings(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;

  const bookings = await bookingService.listMyBookings(userId, userRole);
  sendSuccess(res, bookings);
}

export async function handleHoldEscrow(req: Request, res: Response): Promise<void> {
  const renterId = req.user!.user_id;
  const { id } = req.params;

  const result = await bookingService.holdEscrow(renterId, id);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleAcceptBooking(req: Request, res: Response): Promise<void> {
  const companionUserId = req.user!.user_id;
  const { id } = req.params;

  const result = await bookingService.acceptBooking(companionUserId, id);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleRejectBooking(req: Request, res: Response): Promise<void> {
  const companionUserId = req.user!.user_id;
  const { id } = req.params;
  const { reason } = req.body || {};

  const result = await bookingService.rejectBooking(companionUserId, id, reason);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleTimeoutBooking(req: Request, res: Response): Promise<void> {
  const actorId = req.user?.user_id;
  const { id } = req.params;

  const result = await bookingService.handleTimeout(id, actorId);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleCancelBooking(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;
  const { reason } = req.body || {};

  const result = await bookingService.cancelBooking(userId, userRole, id, reason);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
    policy_applied: (result as any).policy_applied,
  });
}

export async function handleAcceptFulfillment(req: Request, res: Response): Promise<void> {
  const renterId = req.user!.user_id;
  const { id } = req.params;

  const result = await bookingService.acceptFulfillment(renterId, id);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleAutoAccept(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const simulatedNow = req.body?.simulated_now ? new Date(req.body.simulated_now) : undefined;

  const result = await bookingService.autoAccept(id, simulatedNow);
  sendSuccess(res, result, 200, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleReportIssue(req: Request, res: Response): Promise<void> {
  const renterId = req.user!.user_id;
  const { id } = req.params;
  const input = req.body;

  const result = await bookingService.reportIssue(renterId, id, input);
  const statusCode = result.is_idempotent_replay ? 200 : 201;
  sendSuccess(res, result, statusCode, {
    is_idempotent_replay: result.is_idempotent_replay,
  });
}

export async function handleGetDispute(req: Request, res: Response): Promise<void> {
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  const { id } = req.params;

  const result = await bookingService.getDispute(userId, userRole, id);
  sendSuccess(res, result);
}


