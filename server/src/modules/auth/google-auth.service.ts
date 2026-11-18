import * as jose from 'jose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger.js';
import { BusinessError, UnauthorizedError, ConflictError } from '../../common/errors.js';

// Remote JWKS của Google với cơ chế tự động cache và làm mới theo RFC 7517 (FR-001)
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
let googleJWKS: any = jose.createRemoteJWKSet(GOOGLE_JWKS_URL);

/**
 * Cho phép thiết lập Mock JWKS phục vụ kiểm thử tự động không phụ thuộc mạng
 */
export function setMockJWKS(mockJWKS: any): void {
  googleJWKS = mockJWKS;
}

export interface GooglePayloadInfo {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
}

export class GoogleAuthService {
  /**
   * Xác minh chữ ký RS256 và các trường bắt buộc của Google ID Token bằng thư viện jose
   */
  async verifyGoogleIdToken(idToken: string): Promise<GooglePayloadInfo> {
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BusinessError('GOOGLE_CLIENT_ID_MISSING', 'GOOGLE_CLIENT_ID chưa được cấu hình.');
    }

    try {
      const { payload } = await jose.jwtVerify(idToken, googleJWKS, {
        issuer: ['accounts.google.com', 'https://accounts.google.com'],
        audience: clientId,
      });

      // Kiểm tra email_verified = true
      const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
      if (!emailVerified) {
        throw new BusinessError(
          'GOOGLE_EMAIL_NOT_VERIFIED',
          'Tài khoản Google của bạn chưa được xác minh địa chỉ email.'
        );
      }

      const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
      if (!email) {
        throw new BusinessError('INVALID_GOOGLE_PAYLOAD', 'Google ID Token không chứa thông tin email.');
      }

      return {
        google_id: payload.sub as string,
        email,
        name: (payload.name as string) || email.split('@')[0],
        picture: (payload.picture as string) || undefined,
      };
    } catch (err: any) {
      if (err instanceof BusinessError) throw err;
      logger.warn(`[Google OAuth2] Xác minh ID Token thất bại: ${err.message}`);
      throw new UnauthorizedError(`Chữ ký hoặc thông tin Google ID Token không hợp lệ: ${err.message}`);
    }
  }

  /**
   * Đăng nhập hoặc tạo mới tài khoản qua Google OAuth2
   */
  async loginWithGoogle(idToken: string) {
    const googleInfo = await this.verifyGoogleIdToken(idToken);

    // 1. Tìm người dùng theo google_id hoặc email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ google_id: googleInfo.google_id }, { email: googleInfo.email }],
      },
      include: {
        wallet: true,
        companion_profile: true,
      },
    });

    let isNewUser = false;

    if (!user) {
      // 2. Tạo người dùng mới qua Google (chưa hoàn thiện onboarding, chưa tạo ví)
      const randomPassword = Math.random().toString(36).slice(-12) + 'Aa1@';
      const password_hash = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          email: googleInfo.email,
          google_id: googleInfo.google_id,
          display_name: googleInfo.name,
          avatar_url: googleInfo.picture || null,
          password_hash,
          role: 'RENTER',
          is_email_verified: true,
          is_onboarding_completed: false, // Yêu cầu hoàn thiện vai trò và ngày sinh
        },
        include: {
          wallet: true,
          companion_profile: true,
        },
      });

      isNewUser = true;
      logger.info(`[Google OAuth2] Tạo người dùng mới từ Google: user_id=${user.user_id}, email=${user.email}`);
    } else {
      // 3. Nếu đã có tài khoản theo email nhưng chưa gắn google_id thì liên kết tài khoản
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { user_id: user.user_id },
          data: {
            google_id: googleInfo.google_id,
            is_email_verified: true,
          },
          include: {
            wallet: true,
            companion_profile: true,
          },
        });
        logger.info(`[Google OAuth2] Liên kết tài khoản Google ID cho email: ${user.email}`);
      }

      if (user.status === 'BANNED') {
        throw new UnauthorizedError('Tài khoản của bạn đã bị khóa vĩnh viễn.');
      }
    }

    // Phát JWT token chuẩn
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      needs_onboarding: !user.is_onboarding_completed,
      is_new_user: isNewUser,
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_onboarding_completed: user.is_onboarding_completed,
        wallet: user.wallet,
      },
    };
  }

  /**
   * Hoàn tất thông tin hồ sơ cho tài khoản tạo qua Google (FR-001, UC01)
   * Kiểm tra điều khoản, độ tuổi >= 18, khởi tạo ví
   */
  async completeGoogleProfile(
    userId: string,
    input: {
      role: 'RENTER' | 'COMPANION';
      date_of_birth: string;
      terms_accepted: boolean;
    }
  ) {
    if (!input.terms_accepted) {
      throw new BusinessError('TERMS_NOT_ACCEPTED', 'Bạn phải đồng ý với Điều khoản dịch vụ để tiếp tục.');
    }

    const dob = new Date(input.date_of_birth);
    if (isNaN(dob.getTime())) {
      throw new BusinessError('INVALID_BIRTHDATE', 'Ngày sinh không hợp lệ.');
    }

    // Kiểm tra đủ 18 tuổi
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      throw new BusinessError('UNDERAGE_USER', 'Bạn phải từ đủ 18 tuổi trở lên để sử dụng dịch vụ.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { wallet: true },
    });

    if (!existingUser) {
      throw new UnauthorizedError('Không tìm thấy thông tin người dùng.');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật thông tin User
      const updatedUser = await tx.user.update({
        where: { user_id: userId },
        data: {
          role: input.role,
          date_of_birth: dob,
          is_onboarding_completed: true,
        },
      });

      // 2. Khởi tạo Wallet (chỉ sau khi hoàn tất hồ sơ mới có ví)
      let wallet = existingUser.wallet;
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            user_id: userId,
            available_balance: 0,
            escrow_balance: 0,
          },
        });
      }

      // 3. Nếu là COMPANION và chưa có profile, khởi tạo profile mẫu
      if (input.role === 'COMPANION') {
        const existingProfile = await tx.companionProfile.findUnique({
          where: { user_id: userId },
        });

        if (!existingProfile) {
          await tx.companionProfile.create({
            data: {
              user_id: userId,
              profile_status: 'INCOMPLETE',
              availability: 'OFFLINE',
              trust_score: 80.0,
              verification_status: 'UNVERIFIED',
            },
          });
        }
      }

      return { user: updatedUser, wallet };
    });

    // Phát lại JWT token với role mới
    const token = jwt.sign(
      {
        user_id: result.user.user_id,
        email: result.user.email,
        role: result.user.role,
        display_name: result.user.display_name,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        user_id: result.user.user_id,
        email: result.user.email,
        display_name: result.user.display_name,
        role: result.user.role,
        avatar_url: result.user.avatar_url,
        is_onboarding_completed: true,
        wallet: result.wallet,
      },
    };
  }
}

export const googleAuthService = new GoogleAuthService();
