import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const FILE_MAGIC = Buffer.from('ENC1'); // 4-byte header identifying encrypted file (NFR-002)

/**
 * Lấy khóa mã hóa dữ liệu tranh chấp và chat (DATA_ENCRYPTION_KEY - 256-bit chuẩn)
 * Độc lập hoàn toàn với khóa eKYC (EKYC_ENCRYPTION_KEY) theo NFR-002
 */
export function getDataEncryptionKey(): Buffer {
  const rawKey = env.DATA_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error('FATAL: DATA_ENCRYPTION_KEY chưa được cấu hình.');
  }

  // Nếu là chuỗi hex 64 ký tự -> chuyển đổi sang Buffer 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  const buf = Buffer.from(rawKey, 'utf-8');
  if (buf.length === 32) {
    return buf;
  }

  // Dự phòng sinh khóa 32 bytes chuẩn
  return crypto.createHash('sha256').update(rawKey).digest();
}

/**
 * Mã hóa chuỗi văn bản bằng AES-256-GCM (gắn tiền tố phiên bản v1:<iv>:<tag>:<ciphertext>)
 * Hỗ trợ Idempotent: nếu chuỗi đã có tiền tố v1: thì giữ nguyên
 */
export function encryptText(plainText: string | null | undefined): string {
  if (plainText === null || plainText === undefined || plainText === '') {
    return plainText as any;
  }

  if (plainText.startsWith('v1:')) {
    return plainText; // Idempotent: Đã mã hóa
  }

  const key = getDataEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV ngẫu nhiên
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag(); // 128-bit authentication tag

  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Giải mã chuỗi văn bản AES-256-GCM
 * Nếu chuỗi chưa mã hóa (dữ liệu cũ chưa migrate), trả về nguyên bản
 */
export function decryptText(encryptedText: string | null | undefined): string {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText as any;
  }

  if (!encryptedText.startsWith('v1:')) {
    return encryptedText; // Dữ liệu cũ nguyên bản
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 4) {
    logger.warn('Chuỗi mã hóa không đúng định dạng v1:<iv>:<tag>:<ciphertext>');
    return encryptedText;
  }

  const [, ivHex, tagHex, cipherHex] = parts;

  try {
    const key = getDataEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(cipherHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err: any) {
    logger.error(`[AES-256-GCM] Lỗi giải mã văn bản: ${err.message}`);
    throw new Error('Dữ liệu đã bị chỉnh sửa hoặc khóa giải mã không hợp lệ (Auth tag validation failed).');
  }
}

/**
 * Mã hóa tệp tin Buffer bằng AES-256-GCM trên đĩa
 * Cấu trúc đóng gói: [4 bytes MAGIC "ENC1"][12 bytes IV][16 bytes AuthTag][Ciphertext]
 */
export function encryptFileBuffer(plainBuffer: Buffer): Buffer {
  if (isEncryptedFile(plainBuffer)) {
    return plainBuffer; // Idempotent: Đã mã hóa
  }

  const key = getDataEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([FILE_MAGIC, iv, tag, ciphertext]);
}

/**
 * Giải mã tệp tin Buffer AES-256-GCM trong bộ nhớ
 * Phát hiện ngay lập tức nếu tệp bị sửa đổi 1 bit (AuthTag fail)
 */
export function decryptFileBuffer(encryptedBuffer: Buffer): Buffer {
  if (!isEncryptedFile(encryptedBuffer)) {
    return encryptedBuffer; // Tệp cũ chưa mã hóa
  }

  if (encryptedBuffer.length < 32) {
    throw new Error('Tệp mã hóa bị hỏng (kích thước nhỏ hơn header tối thiểu 32 bytes).');
  }

  const key = getDataEncryptionKey();
  const iv = encryptedBuffer.subarray(4, 16);
  const tag = encryptedBuffer.subarray(16, 32);
  const ciphertext = encryptedBuffer.subarray(32);

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err: any) {
    logger.error(`[AES-256-GCM] Lỗi giải mã tệp tin: ${err.message}`);
    throw new Error('Tệp chứng cứ đã bị chỉnh sửa hoặc giả mạo trên đĩa (Auth tag validation failed).');
  }
}

/**
 * Kiểm tra xem tệp Buffer đã được mã hóa theo chuẩn ENC1 chưa
 */
export function isEncryptedFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return buffer.subarray(0, 4).equals(FILE_MAGIC);
}

/**
 * Kiểm tra xem chuỗi văn bản đã được mã hóa v1 chưa
 */
export function isEncryptedText(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.startsWith('v1:');
}
