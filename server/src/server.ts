import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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
import { csRouter, adminRouter } from './modules/admin/admin.router.js';
import { kycRouter } from './modules/kyc/kyc.router.js';
import { bookingRouter } from './modules/booking/booking.router.js';
import { paymentRouter } from './modules/payment/payment.router.js';
import { sessionRouter } from './modules/session/session.router.js';
import { disputeRouter } from './modules/dispute/dispute.router.js';
import { reviewRouter } from './modules/review/review.router.js';
import { withdrawalRouter } from './modules/withdrawal/withdrawal.router.js';
import { newsRouter } from './modules/news/news.router.js';
import { devRouter } from './modules/dev/dev.router.js';
import { notificationRouter } from './modules/notification/notification.router.js';
import { profileRouter } from './modules/profile/profile.router.js';
import { handleSepayWebhook } from './modules/payment/payment.controller.js';
import { sepayWebhookSchema } from './modules/payment/payment.dto.js';
import { validateBody } from './middleware/validate.js';
import { asyncHandler } from './common/asyncHandler.js';
import { bookingAutomationService } from './modules/booking/booking-automation.service.js';
import { wsNotificationService } from './common/ws-notification.service.js';

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

// Bảo vệ thư mục lưu trữ chứng cứ tranh chấp (chống truy cập tĩnh công khai không qua xác thực)
app.use('/uploads/evidences', (_req, res) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN_STATIC_ACCESS',
      message: 'Không thể truy cập trực tiếp bằng chứng qua URL tĩnh. Vui lòng sử dụng API bảo mật /api/disputes/:id/evidences/:evidenceId/file',
    },
  });
});

// Phục vụ ảnh avatar công khai với Cache-Control 1 ngày và nosniff (Đợt E2 / REF-PROF-01)
const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

app.use(
  '/uploads/avatars',
  express.static(avatarsDir, {
    maxAge: '1d',
    index: false,
    dotfiles: 'ignore',
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/webp');
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
    },
  })
);

app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    index: false,
    dotfiles: 'ignore',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  })
);

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
app.use('/api/admin', adminRouter);
app.use('/api', kycRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/withdrawals', withdrawalRouter);
app.use('/api/news', newsRouter);
app.use('/api/dev', devRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/me', profileRouter);

// 4. Webhook SePay chính thức theo đặc tả Đợt C: POST /api/webhooks/sepay
app.post('/api/webhooks/sepay', validateBody(sepayWebhookSchema), asyncHandler(handleSepayWebhook));

// WebSocket Server phục vụ Chat text nội bộ (BR-20, D10) & Thông báo nạp tiền Realtime (Đợt C)
export const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
wsNotificationService.init(wss);

// Phục vụ frontend static build & SPA fallback (chống 404 khi F5 / truy cập trực tiếp các route /tin-tuc, /chinh-sach-escrow,...)
const clientDistCandidates = [
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(__dirname, '..', '..', 'client', 'dist'),
];
const clientDist = clientDistCandidates.find((dir) => fs.existsSync(dir));
if (clientDist) {
  logger.info(`📦 Serving client static build from ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/ws') || req.path.startsWith('/storage')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Khởi chạy server nếu không phải trong môi trường test
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 INSTASQUAD Backend API running at http://localhost:${env.PORT}`);
    logger.info(`📡 WebSocket Server ready at ws://localhost:${env.PORT}/ws`);
    logger.info(`🩺 Health check endpoint: http://localhost:${env.PORT}/api/health`);

    // Khởi chạy Background Automation Worker nếu được kích hoạt
    if (env.ENABLE_BACKGROUND_WORKER) {
      bookingAutomationService.start(env.BACKGROUND_WORKER_INTERVAL_MS);
    }
  });

  const handleGracefulShutdown = () => {
    logger.info('🛑 Nhận tín hiệu tắt ứng dụng. Đang dừng Background Worker và HTTP Server...');
    bookingAutomationService.stop();
    httpServer.close(() => {
      logger.info('✅ HTTP Server đã đóng an toàn.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleGracefulShutdown);
  process.on('SIGTERM', handleGracefulShutdown);
}
