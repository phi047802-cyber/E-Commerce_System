import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { NotFoundError, BusinessError, ForbiddenError, ValidationError } from '../../common/errors.js';
import { getVietnamDayKey, calculateSlotDurationHours } from '../../common/dateUtils.js';
import { UpdateProfileInput, CreateSlotInput, UploadVoiceIntroInput } from './companion.dto.js';
import { env } from '../../config/env.js';

export class CompanionService {
  async getMyProfile(userId: string) {
    const profile = await prisma.companionProfile.findUnique({
      where: { user_id: userId },
      include: {
        game: true,
        tier: true,
        user: {
          select: {
            display_name: true,
            email: true,
            phone_number: true,
            status: true,
            bio: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({ where: { user_id: userId } });
      if (user && user.role === 'COMPANION') {
        return prisma.companionProfile.create({
          data: {
            user_id: userId,
            profile_status: 'INCOMPLETE',
            availability: 'OFFLINE',
            trust_score: 80.0,
            verification_status: 'UNVERIFIED',
          },
          include: {
            game: true,
            tier: true,
            user: {
              select: {
                display_name: true,
                email: true,
                phone_number: true,
                status: true,
                bio: true,
                avatar_url: true,
              },
            },
          },
        });
      }
      throw new NotFoundError('Tài khoản này chưa đăng ký hồ sơ Companion.');
    }

    return profile;
  }

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    let profile = await prisma.companionProfile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      const user = await prisma.user.findUnique({ where: { user_id: userId } });
      if (user && user.role === 'COMPANION') {
        profile = await prisma.companionProfile.create({
          data: {
            user_id: userId,
            profile_status: 'INCOMPLETE',
            availability: 'OFFLINE',
            trust_score: 80.0,
            verification_status: 'UNVERIFIED',
          },
        });
      } else {
        throw new NotFoundError('Tài khoản này chưa đăng ký hồ sơ Companion.');
      }
    }

    const targetGameId = input.game_id !== undefined ? input.game_id : profile.game_id;
    const targetTierId = input.verified_tier_id !== undefined ? input.verified_tier_id : profile.verified_tier_id;
    const targetRate = input.hourly_rate !== undefined ? input.hourly_rate : profile.hourly_rate;
    const targetAccountId = input.game_account_id !== undefined ? input.game_account_id : profile.game_account_id;

    // Kiểm tra game hợp lệ nếu được cập nhật
    if (input.game_id) {
      const gameExists = await prisma.gameCatalog.findUnique({
        where: { game_id: input.game_id },
      });
      if (!gameExists || !gameExists.is_active) {
        throw new BusinessError('GAME_NOT_FOUND', 'Tựa game được chọn không tồn tại hoặc đã ngừng hỗ trợ.');
      }
    }

    // Kiểm tra rank tier hợp lệ và thuộc game đã chọn
    if (targetTierId && targetGameId) {
      const tier = await prisma.skillRankTier.findUnique({
        where: { tier_id: targetTierId },
      });
      if (!tier || tier.game_id !== targetGameId) {
        throw new BusinessError('INVALID_RANK_FOR_GAME', 'Bậc xếp hạng được chọn không thuộc tựa game này.');
      }
    } else if (input.verified_tier_id && !targetGameId) {
      throw new BusinessError('GAME_REQUIRED_FOR_RANK', 'Vui lòng chọn tựa game trước khi chọn bậc xếp hạng.');
    }

    // Nếu đã có đầy đủ 4 thông tin thiết yếu: game_id, verified_tier_id, hourly_rate, game_account_id
    const minRate = env.MIN_COMPANION_HOURLY_RATE || 30000;
    const maxRate = env.MAX_COMPANION_HOURLY_RATE || 1000000;
    if (input.hourly_rate !== undefined && (input.hourly_rate < minRate || input.hourly_rate > maxRate)) {
      throw new BusinessError(
        'INVALID_HOURLY_RATE',
        `Đơn giá thuê phải nằm trong khoảng từ ${minRate.toLocaleString('vi-VN')} đến ${maxRate.toLocaleString('vi-VN')} VND/giờ.`
      );
    }

    const isNowComplete = Boolean(
      targetGameId &&
      targetTierId &&
      targetRate &&
      targetRate >= minRate &&
      targetRate <= maxRate &&
      targetAccountId &&
      targetAccountId.trim().length >= 2
    );

    const newProfileStatus = isNowComplete ? 'ACTIVE' : 'INCOMPLETE';

    // Cập nhật bio trên User nếu có
    if (input.bio !== undefined) {
      await prisma.user.update({
        where: { user_id: userId },
        data: { bio: input.bio.trim() },
      });
    }

    const updated = await prisma.companionProfile.update({
      where: { profile_id: profile.profile_id },
      data: {
        game_id: targetGameId,
        verified_tier_id: targetTierId,
        hourly_rate: targetRate,
        availability: input.availability ?? profile.availability,
        game_account_id: targetAccountId,
        profile_status: newProfileStatus,
        audio_bio_url: input.audio_bio_url !== undefined ? input.audio_bio_url : profile.audio_bio_url,
      },
      include: {
        game: true,
        tier: true,
        user: {
          select: {
            display_name: true,
            email: true,
            phone_number: true,
            status: true,
            bio: true,
            avatar_url: true,
          },
        },
      },
    });

    return updated;
  }

  async getMySlots(userId: string) {
    const profile = await this.getMyProfile(userId);
    const now = new Date();

    // Tự động mở lại các slot HELD đã quá hạn held_until
    await prisma.slotCalendar.updateMany({
      where: {
        profile_id: profile.profile_id,
        status: 'HELD',
        held_until: { lt: now },
      },
      data: {
        status: 'AVAILABLE',
        held_until: null,
      },
    });

    const slots = await prisma.slotCalendar.findMany({
      where: {
        profile_id: profile.profile_id,
      },
      orderBy: { start_time: 'asc' },
    });

    return slots;
  }

  async createSlot(userId: string, input: CreateSlotInput) {
    const profile = await this.getMyProfile(userId);

    // Kiểm tra Companion đã hoàn thiện hồ sơ chưa (Section B.2)
    if (profile.profile_status === 'INCOMPLETE') {
      throw new BusinessError(
        'PROFILE_INCOMPLETE',
        'Vui lòng hoàn thiện hồ sơ (chọn game, rank, đơn giá và mã in-game) trước khi mở khung giờ rảnh.'
      );
    }
    const startTime = new Date(input.start_time);
    const endTime = new Date(input.end_time);
    const now = new Date();

    // 1. Kiểm tra thời gian bắt đầu phải ở tương lai
    if (startTime <= now) {
      throw new BusinessError('SLOT_TIME_IN_PAST', 'Khung giờ rảnh phải diễn ra trong tương lai.');
    }

    // 2. Kiểm tra thời lượng tối thiểu 30 phút, tối đa 8 giờ cho một slot rời rạc
    const slotDurationHours = calculateSlotDurationHours(startTime, endTime);
    if (slotDurationHours < 0.5) {
      throw new BusinessError('SLOT_DURATION_TOO_SHORT', 'Khung giờ tối thiểu phải là 30 phút (0.5 giờ).');
    }
    if (slotDurationHours > 8) {
      throw new BusinessError('SLOT_DURATION_TOO_LONG', 'Một khung giờ không được kéo dài quá 8 giờ liên tục.');
    }

    // 3. Kiểm tra trùng lặp với các slot hiện có của chính Companion
    const existingSlots = await prisma.slotCalendar.findMany({
      where: {
        profile_id: profile.profile_id,
        start_time: { gte: new Date(startTime.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    for (const slot of existingSlots) {
      const sStart = new Date(slot.start_time);
      const sEnd = new Date(slot.end_time);

      // Nếu 2 khoảng thời gian giao nhau: max(sStart, startTime) < min(sEnd, endTime)
      if (sStart < endTime && sEnd > startTime) {
        throw new BusinessError(
          'SLOT_OVERLAPPING',
          `Khung giờ này bị trùng lặp với một khung giờ đã có (${sStart.toLocaleTimeString('vi-VN')} - ${sEnd.toLocaleTimeString('vi-VN')}).`
        );
      }
    }

    // 4. Kiểm tra giới hạn 10 giờ/ngày theo múi giờ Việt Nam (BR-03, D08)
    const targetDayKey = getVietnamDayKey(startTime);
    let totalDayHours = 0;

    for (const slot of existingSlots) {
      const sDayKey = getVietnamDayKey(new Date(slot.start_time));
      if (sDayKey === targetDayKey) {
        totalDayHours += calculateSlotDurationHours(new Date(slot.start_time), new Date(slot.end_time));
      }
    }

    const limitHours = env.MAX_COMPANION_HOURS_PER_DAY;
    if (totalDayHours + slotDurationHours > limitHours) {
      throw new BusinessError(
        'COMPANION_DAILY_LIMIT_EXCEEDED',
        `Tổng thời gian làm việc trong ngày ${targetDayKey} sẽ vượt quá trần quy định ${limitHours} giờ/ngày (Hiện có: ${totalDayHours.toFixed(1)}h, Slot mới: ${slotDurationHours.toFixed(1)}h).`
      );
    }

    // 5. Tạo slot với trạng thái AVAILABLE
    const createdSlot = await prisma.slotCalendar.create({
      data: {
        profile_id: profile.profile_id,
        start_time: startTime,
        end_time: endTime,
        status: 'AVAILABLE',
      },
    });

    return createdSlot;
  }

  async deleteSlot(userId: string, slotId: string) {
    const profile = await this.getMyProfile(userId);

    const slot = await prisma.slotCalendar.findUnique({
      where: { slot_id: slotId },
    });

    if (!slot) {
      throw new NotFoundError('Không tìm thấy khung giờ.');
    }

    if (slot.profile_id !== profile.profile_id) {
      throw new ForbiddenError('Bạn không có quyền xóa khung giờ của người khác.');
    }

    if (slot.status === 'BOOKED') {
      throw new BusinessError('SLOT_ALREADY_BOOKED', 'Không thể xóa khung giờ đã được đặt.');
    }

    const now = new Date();
    if (slot.status === 'HELD' && slot.held_until && slot.held_until > now) {
      throw new BusinessError('SLOT_CURRENTLY_HELD', 'Khung giờ đang có người giữ chỗ tạm thời, không thể xóa lúc này.');
    }

    await prisma.slotCalendar.delete({
      where: { slot_id: slotId },
    });

    return { message: 'Đã xóa khung giờ thành công.' };
  }

  private isValidAudioMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;
    // MP3 with ID3v2 container ("ID3")
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return true;
    // MP3 raw frame sync: 11 bits set (0xFF followed by 0xE0 or higher)
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
    // WebM / Matroska EBML header (0x1A 0x45 0xDF 0xA3)
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return true;
    // OGG container ("OggS")
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return true;
    // WAV container ("RIFF" ... "WAVE")
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return true;
    return false;
  }

  async uploadVoiceIntro(userId: string, input: UploadVoiceIntroInput) {
    const profile = await this.getMyProfile(userId);

    // Chống path traversal: bóc tách phần mở rộng và kiểm tra tên tệp
    if (input.file_name.includes('..') || input.file_name.includes('/') || input.file_name.includes('\\')) {
      throw new ValidationError('Tên tệp không hợp lệ hoặc chứa ký tự chuyển hướng thư mục (Path traversal).');
    }

    const buffer = Buffer.from(input.file_content_base64, 'base64');

    // 1. Kiểm tra dung lượng buffer thực tế (tối đa 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (buffer.length > MAX_SIZE || input.file_size_bytes > MAX_SIZE) {
      throw new ValidationError('Dung lượng tệp âm thanh vượt quá giới hạn tối đa 2MB.');
    }

    // 2. Chống tệp đuôi giả (Extension validation)
    const lowerName = input.file_name.toLowerCase();
    const validExtensions = ['.mp3', '.webm', '.wav', '.ogg'];
    const matchedExt = validExtensions.find((e) => lowerName.endsWith(e));
    if (!matchedExt) {
      throw new ValidationError('Định dạng phần mở rộng tệp không được hỗ trợ hoặc tệp đuôi giả (chỉ hỗ trợ .mp3, .webm, .wav, .ogg).');
    }

    // 3. Kiểm tra magic bytes nội dung tệp thực tế
    if (!this.isValidAudioMagicBytes(buffer)) {
      throw new ValidationError('Nội dung tệp không phải định dạng âm thanh hợp lệ (Magic bytes không khớp MP3/WebM/WAV/OGG).');
    }

    const uploadDir = path.resolve(process.cwd(), 'uploads', 'audios');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sinh tên tệp ngẫu nhiên chống trùng lặp và path traversal
    const safeUuid = crypto.randomUUID();
    const fileName = `voice-${safeUuid}${matchedExt}`;
    const filePath = path.resolve(uploadDir, fileName);

    // Đảm bảo đường dẫn tuyệt đối nằm trọn trong uploadDir
    if (!filePath.startsWith(uploadDir)) {
      throw new ValidationError('Đường dẫn lưu trữ tệp không an toàn.');
    }

    fs.writeFileSync(filePath, buffer);
    try {
      fs.chmodSync(filePath, 0o644); // Không có quyền thực thi (non-executable)
    } catch {
      // Bỏ qua trên hệ điều hành không hỗ trợ POSIX permissions
    }

    const audioUrl = `/uploads/audios/${fileName}`;
    const updated = await prisma.companionProfile.update({
      where: { profile_id: profile.profile_id },
      data: { audio_bio_url: audioUrl },
    });

    return {
      audio_bio_url: updated.audio_bio_url,
      file_name: fileName,
      file_size_bytes: buffer.length,
      message: 'Tải lên ghi âm giới thiệu thành công.',
    };
  }
}

export const companionService = new CompanionService();
