import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError, BusinessError, ForbiddenError } from '../../common/errors.js';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, SendVerifyOtpInput, VerifyEmailInput } from './auth.dto.js';
import { emailService } from './email.service.js';
import { CURRENT_TERMS_VERSION } from '../legal/legal.catalog.js';

export class AuthService {
  async register(input: RegisterInput) {
    if (input.is_over_18 === false) {
      throw new BusinessError('UNDERAGE_REGISTRATION', 'Người dùng phải đủ 18 tuổi để tham gia nền tảng.');
    }

    if (input.date_of_birth) {
      const dob = new Date(input.date_of_birth);
      if (isNaN(dob.getTime())) {
        throw new BusinessError('INVALID_BIRTHDATE', 'Ngày sinh không hợp lệ.');
      }
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BusinessError('UNDERAGE_REGISTRATION', 'Người dùng phải từ đủ 18 tuổi trở lên để tham gia nền tảng.');
      }
    }

    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('EMAIL_ALREADY_EXISTS', 'Email này đã được sử dụng.');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(input.password, salt);

    // Tạo User kèm Wallet ban đầu trong một transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          password_hash,
          display_name: input.display_name,
          role: input.role,
          phone_number: input.phone_number,
          is_email_verified: false,
        },
      });

      await tx.wallet.create({
        data: {
          user_id: newUser.user_id,
          available_balance: 0,
          escrow_balance: 0,
        },
      });

      // Tạo CompanionProfile ở trạng thái INCOMPLETE nếu đăng ký vai trò COMPANION (Section B.1)
      if (input.role === 'COMPANION') {
        await tx.companionProfile.create({
          data: {
            user_id: newUser.user_id,
            profile_status: 'INCOMPLETE',
            availability: 'OFFLINE',
            trust_score: 80.0,
            verification_status: 'UNVERIFIED',
          },
        });
      }

      if (input.accept_terms_version === CURRENT_TERMS_VERSION) {
        await tx.termsAcceptance.create({
          data: { user_id: newUser.user_id, terms_version: CURRENT_TERMS_VERSION, channel: input.channel ?? 'WEB' },
        });
      }

      return newUser;
    });

    const token = this.generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    });

    return {
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        wallet: true,
        companion_profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    if (user.status === 'BANNED') {
      throw new UnauthorizedError('Tài khoản này đã bị khóa vĩnh viễn.');
    }

    // Tạm khóa có thời hạn do vi phạm điều khoản (TERMS_AND_CONTRACTS.md Phần C)
    if (user.status === 'SUSPENDED') {
      if (user.suspended_until && user.suspended_until.getTime() <= Date.now()) {
        await prisma.user.update({ where: { user_id: user.user_id }, data: { status: 'ACTIVE', suspended_until: null } });
      } else {
        throw new ForbiddenError(
          `Tài khoản đang bị tạm khóa${user.suspended_until ? ' đến ' + user.suspended_until.toISOString() : ''} do vi phạm điều khoản.`,
          'ACCOUNT_SUSPENDED'
        );
      }
    }

    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    const token = this.generateToken({
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      display_name: user.display_name,
    });

    return {
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        status: user.status,
        avatar_url: user.avatar_url,
        is_email_verified: user.is_email_verified,
        wallet: user.wallet
          ? {
              available_balance: user.wallet.available_balance,
              escrow_balance: user.wallet.escrow_balance,
            }
          : null,
        companion_profile: user.companion_profile
          ? {
              profile_id: user.companion_profile.profile_id,
              trust_score: user.companion_profile.trust_score,
              hourly_rate: user.companion_profile.hourly_rate,
            }
          : null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        display_name: true,
        role: true,
        status: true,
        avatar_url: true,
        is_email_verified: true,
        created_at: true,
        wallet: {
          select: {
            wallet_id: true,
            available_balance: true,
            escrow_balance: true,
          },
        },
        companion_profile: {
          select: {
            profile_id: true,
            game_id: true,
            verified_tier_id: true,
            hourly_rate: true,
            trust_score: true,
            availability: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy thông tin tài khoản.');
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Chống dò quét tài khoản (Anti-enumeration): trả về cùng thông điệp thành công
      return {
        message: 'Nếu email tồn tại trong hệ thống, mã xác nhận OTP đã được gửi.',
      };
    }

    const result = await emailService.createAndSendOtp(normalizedEmail, 'FORGOT_PASSWORD');
    return {
      message: 'Nếu email tồn tại trong hệ thống, mã xác nhận OTP đã được gửi.',
      simulated_otp: result.simulated_otp,
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản với email này.');
    }

    await emailService.verifyOtp(normalizedEmail, 'FORGOT_PASSWORD', input.otp);

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(input.new_password, salt);

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { password_hash },
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' };
  }

  async sendVerificationOtp(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.is_email_verified) {
      // Chống dò quét tài khoản (Anti-enumeration): trả về cùng thông điệp thành công
      return {
        message: 'Nếu email tồn tại trong hệ thống và chưa xác minh, mã xác nhận OTP đã được gửi.',
      };
    }

    const result = await emailService.createAndSendOtp(normalizedEmail, 'EMAIL_VERIFICATION');
    return {
      message: 'Nếu email tồn tại trong hệ thống và chưa xác minh, mã xác nhận OTP đã được gửi.',
      simulated_otp: result.simulated_otp,
    };
  }

  async verifyEmail(input: VerifyEmailInput) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản với email này.');
    }

    await emailService.verifyOtp(normalizedEmail, 'EMAIL_VERIFICATION', input.otp);

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { is_email_verified: true },
    });

    return { message: 'Xác minh email thành công!', is_email_verified: true };
  }

  private generateToken(payload: { user_id: string; email: string; role: string; display_name: string }) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }
}

export const authService = new AuthService();
