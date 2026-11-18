import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Jimp } from 'jimp';
import { prisma } from '../../common/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError, BusinessError } from '../../common/errors.js';
import { UpdateProfileInput, ChangePasswordInput } from './profile.dto.js';

// Danh sách biểu thức chính quy phát hiện số điện thoại, email, mạng xã hội ngoài sàn
const SENSITIVE_PATTERNS = [
  /(\+84|0)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}/, // SĐT VN
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
  /\b(zalo|telegram|tele|fb|facebook|tiktok|sdt|so dien thoai|chuyen khoan|ck ngoai)\b/i, // Kênh ngoài sàn
];

// In-memory rate limiting cho đổi mật khẩu (tối đa 5 lần thử sai trong 15 phút)
const passwordAttempts = new Map<string, { count: number; lockedUntil: number }>();

export class ProfileService {
  private avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');

  constructor() {
    if (!fs.existsSync(this.avatarsDir)) {
      fs.mkdirSync(this.avatarsDir, { recursive: true });
    }
  }

  /**
   * Lấy thông tin hồ sơ của người dùng hiện tại
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        companion_profile: {
          include: {
            game: true,
            tier: true,
          },
        },
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
    }

    return {
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      phone_number: user.phone_number,
      role: user.role,
      status: user.status,
      avatar_url: user.avatar_url,
      bio: user.bio,
      date_of_birth: user.date_of_birth,
      favorite_games: user.favorite_games,
      created_at: user.created_at,
      wallet_balance: user.wallet?.available_balance ?? 0,
      companion_profile: user.companion_profile
        ? {
            profile_id: user.companion_profile.profile_id,
            game_id: user.companion_profile.game_id,
            game_name: user.companion_profile.game?.game_name ?? null,
            tier_name: user.companion_profile.tier?.tier_name ?? null,
            hourly_rate: user.companion_profile.hourly_rate,
            profile_status: user.companion_profile.profile_status,
            verification_status: user.companion_profile.verification_status,
            availability: user.companion_profile.availability,
            trust_score: user.companion_profile.trust_score,
            game_account_id: user.companion_profile.game_account_id,
            max_hours_per_day: user.companion_profile.max_hours_per_day,
            audio_bio_url: user.companion_profile.audio_bio_url,
          }
        : null,
    };
  }

  /**
   * Cập nhật thông tin hồ sơ (REF-PROF-01)
   */
  async updateProfile(userId: string, input: UpdateProfileInput, ip: string = '127.0.0.1') {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: { companion_profile: true },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
    }

    // 1. Kiểm tra lọc thông tin liên lạc nhạy cảm trong display_name
    if (input.display_name) {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(input.display_name)) {
          throw new ValidationError('Tên hiển thị không được chứa số điện thoại, email hoặc kênh liên hệ ngoài sàn.');
        }
      }
    }

    // 2. Kiểm tra lọc thông tin trong bio
    if (input.bio) {
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(input.bio)) {
          throw new ValidationError('Tiểu sử không được chứa số điện thoại, email hoặc kênh liên hệ trao đổi ngoài sàn.');
        }
      }
    }

    // 3. Chuẩn bị dữ liệu cập nhật User
    const userUpdateData: any = {};
    if (input.display_name !== undefined) userUpdateData.display_name = input.display_name;
    if (input.bio !== undefined) userUpdateData.bio = input.bio;
    if (input.date_of_birth !== undefined) {
      userUpdateData.date_of_birth = input.date_of_birth ? new Date(input.date_of_birth) : null;
    }
    if (input.favorite_games !== undefined) userUpdateData.favorite_games = input.favorite_games;

    // 4. Nếu là Companion Profile, cập nhật các trường được phép
    const companionUpdateData: any = {};
    if (user.companion_profile) {
      if (input.hourly_rate !== undefined) companionUpdateData.hourly_rate = input.hourly_rate;
      if (input.availability !== undefined) companionUpdateData.availability = input.availability;
      if (input.game_account_id !== undefined) companionUpdateData.game_account_id = input.game_account_id;
      if (input.max_hours_per_day !== undefined) companionUpdateData.max_hours_per_day = input.max_hours_per_day;
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { user_id: userId },
          data: userUpdateData,
        });
      }

      if (user.companion_profile && Object.keys(companionUpdateData).length > 0) {
        await tx.companionProfile.update({
          where: { profile_id: user.companion_profile.profile_id },
          data: companionUpdateData,
        });
      }

      await tx.auditLog.create({
        data: {
          actor_id: userId,
          action: 'PROFILE_UPDATED',
          entity_type: 'USER',
          entity_id: userId,
          ip_address: ip,
          payload_json: JSON.stringify({ userUpdateData, companionUpdateData }),
        },
      });
    });

    return this.getProfile(userId);
  }

  /**
   * Tải lên và xử lý ảnh đại diện an toàn (REF-PROF-01)
   */
  async uploadAvatar(userId: string, buffer: Buffer, originalName: string, ip: string = '127.0.0.1') {
    if (!buffer || buffer.length === 0) {
      throw new ValidationError('Tệp ảnh tải lên không được để trống.');
    }

    // 1. Kiểm tra kích thước tệp tối đa 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      throw new ValidationError('Kích thước tệp vượt quá dung lượng cho phép (tối đa 2MB).');
    }

    // 2. Kiểm tra Magic Bytes nhị phân nghiêm ngặt (không tin cậy header Content-Type)
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng =
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a;
    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      throw new ValidationError(
        'Định dạng ảnh không hợp lệ. Chỉ chấp nhận tệp ảnh JPG, PNG hoặc WebP đúng chuẩn nhị phân.'
      );
    }

    // 3. Chuẩn hóa ảnh bằng Jimp: Crop vuông từ tâm, resize 256x256 & 64x64, loại bỏ EXIF metadata
    let processedBuffer: Buffer;
    let thumbBuffer: Buffer;
    try {
      const image = await Jimp.read(buffer);
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      const minDim = Math.min(width, height);
      const cropX = Math.floor((width - minDim) / 2);
      const cropY = Math.floor((height - minDim) / 2);

      // Cắt vuông từ tâm
      image.crop({ x: cropX, y: cropY, w: minDim, h: minDim });

      // Resize avatar chuẩn 256x256
      const avatarImage = image.clone();
      avatarImage.resize({ w: 256, h: 256 });
      processedBuffer = (await avatarImage.getBuffer('image/png')) as Buffer;

      // Resize thumbnail 64x64
      const thumbImage = image.clone();
      thumbImage.resize({ w: 64, h: 64 });
      thumbBuffer = (await thumbImage.getBuffer('image/png')) as Buffer;
    } catch (err: any) {
      throw new ValidationError(`Không thể giải mã tệp ảnh: ${err.message}`);
    }

    // 4. Lưu tệp với tên ngẫu nhiên UUID
    const fileId = crypto.randomUUID();
    const avatarFileName = `${fileId}.png`;
    const thumbFileName = `${fileId}_thumb.png`;

    const avatarFilePath = path.join(this.avatarsDir, avatarFileName);
    const thumbFilePath = path.join(this.avatarsDir, thumbFileName);

    fs.writeFileSync(avatarFilePath, processedBuffer);
    fs.writeFileSync(thumbFilePath, thumbBuffer);

    const avatarUrl = `/uploads/avatars/${avatarFileName}`;

    // 5. Lấy avatar cũ để dọn dẹp trên ổ đĩa
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { avatar_url: true },
    });

    if (user?.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
      const oldFileName = path.basename(user.avatar_url);
      const oldThumbName = oldFileName.replace('.png', '_thumb.png');
      const oldFilePath = path.join(this.avatarsDir, oldFileName);
      const oldThumbPath = path.join(this.avatarsDir, oldThumbName);

      try {
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        if (fs.existsSync(oldThumbPath)) fs.unlinkSync(oldThumbPath);
      } catch {
        // Bỏ qua lỗi xóa file cũ nếu file không tồn tại
      }
    }

    // 6. Cập nhật cơ sở dữ liệu
    await prisma.user.update({
      where: { user_id: userId },
      data: { avatar_url: avatarUrl },
    });

    await prisma.auditLog.create({
      data: {
        actor_id: userId,
        action: 'AVATAR_UPLOADED',
        entity_type: 'USER',
        entity_id: userId,
        ip_address: ip,
        payload_json: JSON.stringify({
          original_name: originalName,
          stored_url: avatarUrl,
          size_bytes: processedBuffer.length,
        }),
      },
    });

    return {
      avatar_url: avatarUrl,
      thumbnail_url: `/uploads/avatars/${thumbFileName}`,
    };
  }

  /**
   * Xóa ảnh đại diện
   */
  async deleteAvatar(userId: string, ip: string = '127.0.0.1') {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { avatar_url: true },
    });

    if (user?.avatar_url && user.avatar_url.startsWith('/uploads/avatars/')) {
      const fileName = path.basename(user.avatar_url);
      const thumbName = fileName.replace('.png', '_thumb.png');
      const filePath = path.join(this.avatarsDir, fileName);
      const thumbPath = path.join(this.avatarsDir, thumbName);

      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      } catch {
        // Bỏ qua lỗi xóa tệp
      }
    }

    await prisma.user.update({
      where: { user_id: userId },
      data: { avatar_url: null },
    });

    await prisma.auditLog.create({
      data: {
        actor_id: userId,
        action: 'AVATAR_DELETED',
        entity_type: 'USER',
        entity_id: userId,
        ip_address: ip,
      },
    });

    return { success: true };
  }

  /**
   * Đổi mật khẩu tài khoản
   */
  async changePassword(userId: string, input: ChangePasswordInput, ip: string = '127.0.0.1') {
    // 1. Kiểm tra rate limit chống dò mật khẩu
    const now = Date.now();
    const rateData = passwordAttempts.get(userId) || { count: 0, lockedUntil: 0 };
    if (rateData.lockedUntil > now) {
      const remainingMin = Math.ceil((rateData.lockedUntil - now) / 60000);
      throw new BusinessError(
        'PASSWORD_CHANGE_RATE_LIMITED',
        `Tài khoản tạm thời bị khóa tính năng đổi mật khẩu do thử sai nhiều lần. Vui lòng thử lại sau ${remainingMin} phút.`
      );
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng.');
    }

    // 2. Xác thực mật khẩu hiện tại
    const isMatch = await bcrypt.compare(input.current_password, user.password_hash);
    if (!isMatch) {
      rateData.count += 1;
      if (rateData.count >= 5) {
        rateData.lockedUntil = now + 15 * 60 * 1000; // Khóa 15 phút
      }
      passwordAttempts.set(userId, rateData);
      throw new ValidationError('Mật khẩu hiện tại không chính xác.');
    }

    // 3. Mật khẩu mới không được trùng mật khẩu cũ
    const isSame = await bcrypt.compare(input.new_password, user.password_hash);
    if (isSame) {
      throw new ValidationError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }

    // 4. Băm mật khẩu mới và lưu
    const newHash = await bcrypt.hash(input.new_password, 10);
    await prisma.user.update({
      where: { user_id: userId },
      data: { password_hash: newHash },
    });

    // Reset rate limiter
    passwordAttempts.delete(userId);

    // 5. Ghi AuditLog
    await prisma.auditLog.create({
      data: {
        actor_id: userId,
        action: 'PASSWORD_CHANGED',
        entity_type: 'USER',
        entity_id: userId,
        ip_address: ip,
      },
    });

    return { success: true, message: 'Đổi mật khẩu thành công.' };
  }
}

export const profileService = new ProfileService();
