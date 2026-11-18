import nodemailer, { Transporter } from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { BusinessError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.NODE_ENV === 'production' && env.SMTP_USER !== 'mock_mailer_user') {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    if (this.transporter) {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
      });
    } else {
      // Trong môi trường dev / test, log trực tiếp ra console
      logger.info(`[EMAIL-SERVICE] Gửi mail tới: ${to} | Tiêu đề: ${subject} | Nội dung: ${text}`);
    }
  }

  async createAndSendOtp(email: string, purpose: 'FORGOT_PASSWORD' | 'EMAIL_VERIFICATION'): Promise<{ message: string; simulated_otp?: string }> {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Kiểm tra rate limit: 60 giây giữa các lần yêu cầu
    const lastOtp = await prisma.authOtp.findFirst({
      where: { email: normalizedEmail, purpose },
      orderBy: { created_at: 'desc' },
    });

    if (lastOtp) {
      const diffMs = Date.now() - new Date(lastOtp.created_at).getTime();
      if (diffMs < 60 * 1000) {
        const waitSec = Math.ceil((60 * 1000 - diffMs) / 1000);
        throw new BusinessError(
          'OTP_RATE_LIMITED',
          `Vui lòng đợi ${waitSec} giây trước khi yêu cầu gửi lại mã OTP.`
        );
      }
    }

    // 2. Tạo mã OTP 6 chữ số ngẫu nhiên & băm bằng HMAC-SHA256 với khóa hệ thống
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHmac('sha256', env.JWT_SECRET).update(otpCode).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 phút TTL

    await prisma.authOtp.create({
      data: {
        email: normalizedEmail,
        otp_hash: otpHash,
        purpose,
        expires_at: expiresAt,
      },
    });

    const subject = purpose === 'FORGOT_PASSWORD'
      ? '[InstaSquad] Mã xác nhận đặt lại mật khẩu'
      : '[InstaSquad] Mã xác nhận email tài khoản';

    const text = `Mã xác nhận (OTP) của bạn là: ${otpCode}. Mã có hiệu lực trong 10 phút. Tuyệt đối không chia sẻ mã này cho người khác.`;

    await this.sendEmail(normalizedEmail, subject, text);

    return {
      message: 'Mã xác nhận đã được gửi đến email của bạn.',
      simulated_otp: process.env.NODE_ENV === 'test' ? otpCode : undefined,
    };
  }

  async verifyOtp(email: string, purpose: 'FORGOT_PASSWORD' | 'EMAIL_VERIFICATION', enteredOtp: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await prisma.authOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otpRecord) {
      throw new BusinessError('OTP_NOT_FOUND', 'Không tìm thấy yêu cầu xác nhận hoặc mã đã hết hạn.');
    }

    // Kiểm tra hết hạn 10 phút
    if (new Date() > new Date(otpRecord.expires_at)) {
      throw new BusinessError('OTP_EXPIRED', 'Mã xác nhận đã hết hạn (quá 10 phút). Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra số lần thử (tối đa 5 lần)
    if (otpRecord.attempts >= 5) {
      throw new BusinessError('OTP_MAX_ATTEMPTS_EXCEEDED', 'Mã xác nhận đã vượt quá 5 lần thử. Vui lòng yêu cầu mã mới.');
    }

    const hashedEntered = crypto.createHmac('sha256', env.JWT_SECRET).update(enteredOtp.trim()).digest('hex');
    const expectedBuf = Buffer.from(otpRecord.otp_hash, 'utf-8');
    const enteredBuf = Buffer.from(hashedEntered, 'utf-8');

    const isMatch = expectedBuf.length === enteredBuf.length && crypto.timingSafeEqual(expectedBuf, enteredBuf);

    if (!isMatch) {
      await prisma.authOtp.update({
        where: { otp_id: otpRecord.otp_id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = 5 - (otpRecord.attempts + 1);
      throw new BusinessError('OTP_INVALID', `Mã xác nhận không chính xác. Bạn còn ${remaining} lần thử.`);
    }

    // Thành công: Xóa toàn bộ OTP đã dùng của email này
    await prisma.authOtp.deleteMany({
      where: { email: normalizedEmail, purpose },
    });

    return true;
  }
}

export const emailService = new EmailService();
