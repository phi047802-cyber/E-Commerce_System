import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.router.js';
import { authRouter } from './modules/auth/auth.router.js';
import { catalogRouter } from './modules/catalog/catalog.router.js';
import { companionRouter } from './modules/companion/companion.router.js';
import { walletRouter } from './modules/wallet/wallet.router.js';
import { csRouter } from './modules/admin/admin.router.js';
import { bookingRouter } from './modules/booking/booking.router.js';
import { paymentRouter } from './modules/payment/payment.router.js';
import { sessionRouter } from './modules/session/session.router.js';
import { disputeRouter } from './modules/dispute/dispute.router.js';
import { reviewRouter } from './modules/review/review.router.js';
import { withdrawalRouter } from './modules/withdrawal/withdrawal.router.js';
import { devRouter } from './modules/dev/dev.router.js';

export const app = express();
export const httpServer = createServer(app);

// Cấu hình CORS an toàn
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Key', 'X-Mock-Signature'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Ghi nhận request (Logging middleware)
app.use((req, _res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

// Đăng ký API Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api', catalogRouter);
app.use('/api/companion', companionRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/disputes', disputeRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/cs', csRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/withdrawals', withdrawalRouter);
app.use('/api/dev', devRouter);

// WebSocket Server phục vụ Chat text nội bộ (BR-20, D10)
export const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws, req) => {
  logger.info(`WebSocket client connected from ${req.socket.remoteAddress}`);

  ws.on('message', (message) => {
    logger.debug(`Received WS message: ${message.toString()}`);
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// Global Error Handler
app.use(errorHandler);

// Khởi chạy server nếu không phải trong môi trường test
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 INSTASQUAD Backend API running at http://localhost:${env.PORT}`);
    logger.info(`📡 WebSocket Server ready at ws://localhost:${env.PORT}/ws`);
    logger.info(`🩺 Health check endpoint: http://localhost:${env.PORT}/api/health`);
  });
}
