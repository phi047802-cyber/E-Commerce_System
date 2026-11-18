/**
 * INSTASQUAD Dev Tools - Data Encryption Migration Script (NFR-002)
 *
 * Mã hóa toàn bộ dữ liệu khiếu nại, giải trình, tin nhắn chat và tệp tin chứng cứ
 * trên đĩa bằng thuật toán AES-256-GCM với khóa riêng biệt DATA_ENCRYPTION_KEY.
 *
 * Tính chất: Hoàn toàn Idempotent (chạy một lần hoặc nhiều lần không làm hỏng dữ liệu).
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../../server/src/common/prisma.js';
import { encryptText, isEncryptedText, encryptFileBuffer, isEncryptedFile } from '../../server/src/common/crypto.js';
import { logger } from '../../server/src/common/logger.js';

export async function runDataEncryptionMigration(): Promise<{
  disputesMigrated: number;
  chatMessagesMigrated: number;
  filesMigrated: number;
}> {
  console.log('🔒 [NFR-002] Bắt đầu quá trình di chuyển và mã hóa dữ liệu AES-256-GCM...');

  let disputesMigrated = 0;
  let chatMessagesMigrated = 0;
  let filesMigrated = 0;

  // 1. Mã hóa bảng DisputeCase (mô tả sự cố & giải trình Companion)
  const disputes = await prisma.disputeCase.findMany();
  for (const d of disputes) {
    let needsUpdate = false;
    let newDesc = d.description;
    let newExp = d.companion_explanation;

    if (d.description && !isEncryptedText(d.description)) {
      newDesc = encryptText(d.description);
      needsUpdate = true;
    }

    if (d.companion_explanation && !isEncryptedText(d.companion_explanation)) {
      newExp = encryptText(d.companion_explanation);
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.disputeCase.update({
        where: { dispute_id: d.dispute_id },
        data: {
          description: newDesc,
          companion_explanation: newExp,
        },
      });
      disputesMigrated++;
    }
  }

  // 2. Mã hóa bảng ChatMessage (nội dung kiểm duyệt & nội dung gốc)
  const messages = await prisma.chatMessage.findMany();
  for (const m of messages) {
    let needsUpdate = false;
    let newContent = m.content;
    let newOriginal = m.original_content;

    if (m.content && !isEncryptedText(m.content)) {
      newContent = encryptText(m.content);
      needsUpdate = true;
    }

    if (m.original_content && !isEncryptedText(m.original_content)) {
      newOriginal = encryptText(m.original_content);
      needsUpdate = true;
    }

    if (needsUpdate) {
      await prisma.chatMessage.update({
        where: { message_id: m.message_id },
        data: {
          content: newContent,
          original_content: newOriginal,
        },
      });
      chatMessagesMigrated++;
    }
  }

  // 3. Mã hóa tệp tin chứng cứ trên đĩa uploads/evidences
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'evidences');
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      const fullPath = path.join(uploadDir, file);
      if (fs.statSync(fullPath).isFile()) {
        const rawBuffer = fs.readFileSync(fullPath);
        if (!isEncryptedFile(rawBuffer)) {
          const encrypted = encryptFileBuffer(rawBuffer);
          fs.writeFileSync(fullPath, encrypted);
          filesMigrated++;
        }
      }
    }
  }

  console.log(`✅ [NFR-002] Hoàn tất mã hóa:`);
  console.log(`   - Hồ sơ khiếu nại đã mã hóa: ${disputesMigrated}/${disputes.length}`);
  console.log(`   - Tin nhắn chat đã mã hóa: ${chatMessagesMigrated}/${messages.length}`);
  console.log(`   - Tệp tin chứng cứ đã mã hóa: ${filesMigrated}`);

  return {
    disputesMigrated,
    chatMessagesMigrated,
    filesMigrated,
  };
}

// Nếu chạy trực tiếp từ dòng lệnh
if (process.argv[1]?.endsWith('migrate_encrypt_data.ts') || process.argv[1]?.endsWith('migrate_encrypt_data.js')) {
  runDataEncryptionMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('💥 Lỗi di chuyển dữ liệu:', err);
      process.exit(1);
    });
}
