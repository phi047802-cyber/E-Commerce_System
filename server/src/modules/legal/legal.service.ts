import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { BusinessError, ForbiddenError, NotFoundError, ValidationError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger.js';
import {
  CURRENT_TERMS_VERSION,
  TERMS_SUMMARY,
  VIOLATION_CATALOG,
  findViolationRule,
  suspensionDaysFor,
} from './legal.catalog.js';

export interface RecordViolationInput {
  user_id: string;
  code: string;
  note: string;
  booking_id?: string;
}

export class LegalService {
  getTerms() {
    return { ...TERMS_SUMMARY, violations: VIOLATION_CATALOG };
  }

  async getAcceptanceStatus(userId: string) {
    const acceptance = await prisma.termsAcceptance.findUnique({
      where: { user_id_terms_version: { user_id: userId, terms_version: CURRENT_TERMS_VERSION } },
    });
    return {
      current_version: CURRENT_TERMS_VERSION,
      accepted: !!acceptance,
      accepted_at: acceptance?.accepted_at ?? null,
      channel: acceptance?.channel ?? null,
    };
  }

  /** Ghi nhận chấp thuận điều khoản (idempotent theo user + phiên bản). */
  async acceptTerms(userId: string, termsVersion: string, channel: 'WEB' | 'MOBILE', ip?: string) {
    if (termsVersion !== CURRENT_TERMS_VERSION) {
      throw new BusinessError(
        'TERMS_VERSION_MISMATCH',
        `Phiên bản điều khoản '${termsVersion}' không còn hiệu lực. Phiên bản hiện hành: ${CURRENT_TERMS_VERSION}.`
      );
    }
    const ipHash = ip ? crypto.createHmac('sha256', env.JWT_SECRET).update(ip).digest('hex') : null;
    const record = await prisma.termsAcceptance.upsert({
      where: { user_id_terms_version: { user_id: userId, terms_version: termsVersion } },
      update: {},
      create: { user_id: userId, terms_version: termsVersion, channel, ip_hash: ipHash },
    });
    return { current_version: CURRENT_TERMS_VERSION, accepted: true, accepted_at: record.accepted_at, channel: record.channel };
  }

  /** Chặn giao dịch khi chưa chấp thuận phiên bản điều khoản hiện hành (TERMS_AND_CONTRACTS.md B.6). */
  async assertTermsAccepted(userId: string): Promise<void> {
    if (!env.REQUIRE_TERMS_ACCEPTANCE) return;
    const status = await this.getAcceptanceStatus(userId);
    if (!status.accepted) {
      throw new ForbiddenError(
        `Bạn cần đọc và chấp thuận Điều khoản sử dụng phiên bản ${CURRENT_TERMS_VERSION} trước khi giao dịch.`,
        'TERMS_NOT_ACCEPTED'
      );
    }
  }

  /**
   * CS/Admin ghi nhận vi phạm. Tự động: trừ TrustScore (ghi TrustScoreLog với reason_code PENALTY_*
   * để công thức TrustScore tính vào DirectPenalties) và khóa tài khoản theo bậc thang tái phạm.
   * Không trừ tiền — chế tài tiền chỉ qua phán quyết khiếu nại (Phần D).
   */
  async recordViolation(recorderId: string, input: RecordViolationInput) {
    const rule = findViolationRule(input.code);
    if (!rule) throw new ValidationError(`Mã vi phạm '${input.code}' không tồn tại (V01–V08).`);
    if (!input.note || input.note.trim().length < 10) {
      throw new ValidationError('Ghi chú vi phạm bắt buộc, tối thiểu 10 ký tự để phục vụ kiểm toán.');
    }
    if (recorderId === input.user_id) throw new ForbiddenError('Không thể tự ghi nhận vi phạm cho chính mình.');

    const subject = await prisma.user.findUnique({
      where: { user_id: input.user_id },
      include: { companion_profile: true },
    });
    if (!subject) throw new NotFoundError('Không tìm thấy người dùng bị ghi nhận vi phạm.');
    if (!['RENTER', 'COMPANION'].includes(subject.role)) {
      throw new BusinessError('VIOLATION_SUBJECT_INVALID', 'Chỉ ghi nhận vi phạm cho Renter hoặc Companion.');
    }
    if (rule.applies_to === 'COMPANION' && subject.role !== 'COMPANION') {
      throw new BusinessError('VIOLATION_NOT_APPLICABLE', `Vi phạm ${rule.code} chỉ áp dụng cho Companion.`);
    }
    if (rule.applies_to === 'RENTER' && subject.role !== 'RENTER') {
      throw new BusinessError('VIOLATION_NOT_APPLICABLE', `Vi phạm ${rule.code} chỉ áp dụng cho Renter.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const priorCount = await tx.violationRecord.count({ where: { user_id: subject.user_id, code: rule.code } });
      const occurrence = priorCount + 1;
      const suspensionDays = suspensionDaysFor(rule, occurrence);
      const profile = subject.companion_profile;
      const trustDelta = profile ? rule.trust_delta : 0;

      const record = await tx.violationRecord.create({
        data: {
          user_id: subject.user_id,
          code: rule.code,
          severity: rule.severity,
          booking_id: input.booking_id ?? null,
          trust_delta: trustDelta,
          suspension_days: suspensionDays,
          note: input.note.trim(),
          recorded_by: recorderId,
        },
      });

      let newScore: number | null = null;
      if (profile && trustDelta !== 0) {
        newScore = Math.max(0, Math.min(100, Number((profile.trust_score + trustDelta).toFixed(2))));
        const suspendProfile = newScore < 40;
        await tx.companionProfile.update({
          where: { profile_id: profile.profile_id },
          data: {
            trust_score: newScore,
            ...(suspendProfile ? { verification_status: 'SUSPENDED', availability: 'OFFLINE' } : {}),
          },
        });
        await tx.trustScoreLog.create({
          data: {
            profile_id: profile.profile_id,
            booking_id: input.booking_id ?? null,
            reason_code: `PENALTY_VIOLATION_${rule.code}`,
            delta: trustDelta,
            score_after: newScore,
          },
        });
      }

      let accountStatus = subject.status;
      let suspendedUntil: Date | null = subject.suspended_until;
      if (suspensionDays === -1) {
        accountStatus = 'BANNED';
        suspendedUntil = null;
      } else if (suspensionDays > 0 && subject.status !== 'BANNED') {
        accountStatus = 'SUSPENDED';
        suspendedUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
      }
      if (accountStatus !== subject.status || suspendedUntil !== subject.suspended_until) {
        await tx.user.update({
          where: { user_id: subject.user_id },
          data: { status: accountStatus, suspended_until: suspendedUntil },
        });
      }

      await tx.auditLog.create({
        data: {
          actor_id: recorderId,
          action: 'VIOLATION_RECORDED',
          entity_type: 'USER',
          entity_id: subject.user_id,
          payload_json: JSON.stringify({ code: rule.code, occurrence, trust_delta: trustDelta, suspension_days: suspensionDays }),
        },
      });
      await tx.notification.create({
        data: {
          user_id: subject.user_id,
          title: 'Ghi nhận vi phạm điều khoản',
          message: `Tài khoản của bạn bị ghi nhận vi phạm ${rule.code} (${rule.title}).` +
            (suspensionDays === -1 ? ' Tài khoản bị khóa vĩnh viễn.' : suspensionDays > 0 ? ` Tài khoản bị tạm khóa ${suspensionDays} ngày.` : ''),
          type: 'VIOLATION',
        },
      });

      return { record, occurrence, new_trust_score: newScore, account_status: accountStatus, suspended_until: suspendedUntil };
    });

    logger.info(`⚖️ [Legal] ${rule.code} recorded for ${subject.user_id} (lần ${result.occurrence}) by ${recorderId}`);
    return result;
  }

  async listViolations(userId?: string) {
    return prisma.violationRecord.findMany({
      where: userId ? { user_id: userId } : {},
      orderBy: { created_at: 'desc' },
      take: 100,
      include: { user: { select: { display_name: true, role: true, status: true } } },
    });
  }

  async listMyViolations(userId: string) {
    return prisma.violationRecord.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: { violation_id: true, code: true, severity: true, trust_delta: true, suspension_days: true, note: true, created_at: true },
    });
  }
}

export const legalService = new LegalService();
