import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { BusinessError, NotFoundError, ForbiddenError, ValidationError } from '../../common/errors.js';
import { logger } from '../../common/logger.js';

const KYC_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'kyc_encrypted');

// Đảm bảo thư mục lưu trữ file mã hóa tồn tại
if (!fs.existsSync(KYC_STORAGE_DIR)) {
  fs.mkdirSync(KYC_STORAGE_DIR, { recursive: true });
}

export function isValidImageMagicBytes(buffer: Buffer): { valid: boolean; mime: string } {
  if (buffer.length < 8) return { valid: false, mime: '' };
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { valid: true, mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return { valid: true, mime: 'image/png' };
  }
  return { valid: false, mime: '' };
}

export class KycService {
  private getEncryptionKey(): Buffer {
    // Luôn sinh khoá 256-bit chuẩn từ biến môi trường EKYC_ENCRYPTION_KEY
    return crypto.createHash('sha256').update(env.EKYC_ENCRYPTION_KEY).digest();
  }

  encryptAndSave(plainBuffer: Buffer, prefix: string): { filePath: string; ivHex: string; tagHex: string } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit chuẩn cho AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    const fileName = `kyc-${prefix}-${crypto.randomUUID()}.enc`;
    const fullPath = path.join(KYC_STORAGE_DIR, fileName);

    fs.writeFileSync(fullPath, encrypted);

    return {
      filePath: fullPath,
      ivHex: iv.toString('hex'),
      tagHex: tag.toString('hex'),
    };
  }

  decryptFile(filePath: string, ivHex: string, tagHex: string): Buffer {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Tệp dữ liệu eKYC không tồn tại trên hệ thống lưu trữ.');
    }

    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedData = fs.readFileSync(filePath);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }

  async submitKyc(
    userId: string,
    files: {
      idFrontBase64: string;
      idBackBase64: string;
      selfieBase64: string;
    }
  ) {
    // 1. Kiểm tra quyền của Companion (Dựa trên Role và tự bảo đảm có hồ sơ CompanionProfile)
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user || user.role !== 'COMPANION') {
      throw new ForbiddenError('Chỉ tài khoản Companion mới có thể gửi yêu cầu xác thực eKYC.');
    }

    let companion = await prisma.companionProfile.findUnique({
      where: { user_id: userId },
    });

    if (!companion) {
      // Tự động bù CompanionProfile INCOMPLETE nếu tài khoản Companion cũ bị thiếu (Section B.1)
      companion = await prisma.companionProfile.create({
        data: {
          user_id: userId,
          profile_status: 'INCOMPLETE',
          availability: 'OFFLINE',
          trust_score: 80.0,
          verification_status: 'UNVERIFIED',
        },
      });
    }

    // 2. Chuyển đổi và kiểm tra 3 tệp ảnh
    const items = [
      { name: 'CCCD Mặt trước', key: 'front', base64: files.idFrontBase64 },
      { name: 'CCCD Mặt sau', key: 'back', base64: files.idBackBase64 },
      { name: 'Ảnh chân dung cầm CCCD', key: 'selfie', base64: files.selfieBase64 },
    ];

    const processed: { filePath: string; ivHex: string; tagHex: string }[] = [];

    for (const item of items) {
      if (!item.base64) {
        throw new ValidationError(`Thiếu dữ liệu ảnh ${item.name}.`);
      }

      // Loại bỏ prefix data:image/...;base64, nếu có
      const cleanBase64 = item.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      // Giới hạn 2MB
      if (buffer.length > 2 * 1024 * 1024) {
        throw new ValidationError(`Ảnh ${item.name} vượt quá dung lượng tối đa cho phép (2MB).`);
      }

      // Kiểm tra magic bytes
      const { valid } = isValidImageMagicBytes(buffer);
      if (!valid) {
        throw new ValidationError(`Tệp ${item.name} không phải là định dạng ảnh hợp lệ (chỉ hỗ trợ JPG/PNG).`);
      }

      // Mã hóa và lưu đĩa
      const result = this.encryptAndSave(buffer, item.key);
      processed.push(result);
    }

    // 3. Tạo bản ghi KycRecord và cập nhật trạng thái Companion
    const kycRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.kycRecord.create({
        data: {
          user_id: userId,
          id_front_path: processed[0].filePath,
          id_front_iv: processed[0].ivHex,
          id_front_tag: processed[0].tagHex,
          id_back_path: processed[1].filePath,
          id_back_iv: processed[1].ivHex,
          id_back_tag: processed[1].tagHex,
          selfie_path: processed[2].filePath,
          selfie_iv: processed[2].ivHex,
          selfie_tag: processed[2].tagHex,
          status: 'PENDING',
        },
      });

      await tx.companionProfile.update({
        where: { user_id: userId },
        data: { verification_status: 'PENDING_REVIEW' },
      });

      return record;
    });

    logger.info(`Companion ${userId} submitted eKYC: record ${kycRecord.kyc_id}`);

    return {
      kyc_id: kycRecord.kyc_id,
      status: kycRecord.status,
      message: 'Hồ sơ eKYC đã được mã hóa an toàn và gửi tới Quản trị viên để xét duyệt.',
    };
  }

  async getPendingList() {
    return prisma.kycRecord.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            user_id: true,
            display_name: true,
            email: true,
            created_at: true,
            companion_profile: {
              select: {
                profile_id: true,
                hourly_rate: true,
                verification_status: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDecryptedImage(
    adminUserId: string,
    kycId: string,
    type: 'front' | 'back' | 'selfie',
    ip?: string
  ): Promise<{ buffer: Buffer; mime: string }> {
    const record = await prisma.kycRecord.findUnique({
      where: { kyc_id: kycId },
    });

    if (!record) {
      throw new NotFoundError('Không tìm thấy bản ghi eKYC.');
    }

    let filePath = '';
    let ivHex = '';
    let tagHex = '';

    if (type === 'front') {
      filePath = record.id_front_path;
      ivHex = record.id_front_iv;
      tagHex = record.id_front_tag;
    } else if (type === 'back') {
      filePath = record.id_back_path;
      ivHex = record.id_back_iv;
      tagHex = record.id_back_tag;
    } else if (type === 'selfie') {
      filePath = record.selfie_path;
      ivHex = record.selfie_iv;
      tagHex = record.selfie_tag;
    } else {
      throw new ValidationError('Loại ảnh không hợp lệ (chỉ chấp nhận front, back, selfie).');
    }

    // Ghi AuditLog bảo mật: mỗi lần Admin xem ảnh eKYC đều được lưu vết
    await prisma.auditLog.create({
      data: {
        actor_id: adminUserId,
        action: 'VIEW_EKYC_IMAGE',
        entity_type: 'KycRecord',
        entity_id: kycId,
        payload_json: JSON.stringify({ type }),
        ip_address: ip || 'unknown',
      },
    });

    const decrypted = this.decryptFile(filePath, ivHex, tagHex);
    const { mime } = isValidImageMagicBytes(decrypted);

    return {
      buffer: decrypted,
      mime: mime || 'image/jpeg',
    };
  }

  async reviewKyc(
    adminUserId: string,
    kycId: string,
    decision: 'VERIFIED' | 'REJECTED',
    rejectionReason?: string
  ) {
    const record = await prisma.kycRecord.findUnique({
      where: { kyc_id: kycId },
    });

    if (!record) {
      throw new NotFoundError('Không tìm thấy bản ghi eKYC.');
    }

    if (record.status !== 'PENDING') {
      throw new BusinessError('KYC_ALREADY_REVIEWED', 'Hồ sơ eKYC này đã được xử lý trước đó.');
    }

    if (decision === 'REJECTED' && !rejectionReason) {
      throw new ValidationError('Vui lòng cung cấp lý do từ chối hồ sơ eKYC.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.kycRecord.update({
        where: { kyc_id: kycId },
        data: {
          status: decision,
          reviewed_by: adminUserId,
          reviewed_at: new Date(),
          rejection_reason: decision === 'REJECTED' ? rejectionReason : null,
        },
      });

      await tx.companionProfile.update({
        where: { user_id: record.user_id },
        data: {
          verification_status: decision,
        },
      });

      await tx.auditLog.create({
        data: {
          actor_id: adminUserId,
          action: `REVIEW_EKYC_${decision}`,
          entity_type: 'KycRecord',
          entity_id: kycId,
          payload_json: JSON.stringify({ decision, rejectionReason }),
        },
      });

      return updatedRecord;
    });

    logger.info(`Admin ${adminUserId} reviewed eKYC ${kycId}: ${decision}`);

    return {
      kyc_id: updated.kyc_id,
      status: updated.status,
      message: decision === 'VERIFIED' ? 'Đã duyệt hồ sơ eKYC thành công.' : 'Đã từ chối hồ sơ eKYC.',
    };
  }
}

export const kycService = new KycService();
