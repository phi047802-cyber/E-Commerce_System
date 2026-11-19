import { afterAll } from 'vitest';
import { prisma } from '../../server/src/common/prisma.js';

/**
 * Mỗi file test nạp lại module graph (isolate) → tạo một PrismaClient + query engine native mới
 * trong CÙNG một worker thread (singleThread, D41). Không đóng lại thì engine tích lũy và tiến trình Node
 * sập ngắt quãng với mã 0xC0000409 sau ~6 file (Bước 6, D44). Đóng kết nối sau mỗi file.
 */
afterAll(async () => {
  await prisma.$disconnect();
});
