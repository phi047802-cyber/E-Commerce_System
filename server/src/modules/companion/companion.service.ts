import { prisma } from '../../common/prisma.js';
import { NotFoundError, BusinessError, ForbiddenError } from '../../common/errors.js';
import { getVietnamDayKey, calculateSlotDurationHours } from '../../common/dateUtils.js';
import { UpdateProfileInput, CreateSlotInput } from './companion.dto.js';
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
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Tài khoản này chưa đăng ký hồ sơ Companion.');
    }

    return profile;
  }

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    const profile = await prisma.companionProfile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundError('Tài khoản này chưa đăng ký hồ sơ Companion.');
    }

    const updated = await prisma.companionProfile.update({
      where: { profile_id: profile.profile_id },
      data: {
        hourly_rate: input.hourly_rate ?? profile.hourly_rate,
        availability: input.availability ?? profile.availability,
        game_account_id: input.game_account_id ?? profile.game_account_id,
        audio_bio_url: input.audio_bio_url !== undefined ? input.audio_bio_url : profile.audio_bio_url,
      },
      include: {
        game: true,
        tier: true,
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
}

export const companionService = new CompanionService();
