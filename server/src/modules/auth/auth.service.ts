import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../common/errors.js';
import { RegisterInput, LoginInput } from './auth.dto.js';

export class AuthService {
  async register(input: RegisterInput) {
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
        },
      });

      await tx.wallet.create({
        data: {
          user_id: newUser.user_id,
          available_balance: 0,
          escrow_balance: 0,
        },
      });

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

  private generateToken(payload: { user_id: string; email: string; role: string; display_name: string }) {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }
}

export const authService = new AuthService();
