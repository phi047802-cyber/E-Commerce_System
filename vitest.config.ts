import { defineConfig } from 'vitest/config';
import { resolveTestDatabaseUrl } from './tests/setup/test-db';
import AlphaSequencer from './tests/setup/alpha-sequencer';

export default defineConfig({
  test: {
    // Test chạy trên DB SQL Server riêng `<db>_test`, migrate + seed một lần ở globalSetup (D41).
    globalSetup: ['./tests/setup/global-setup.ts'],
    // Đóng PrismaClient sau mỗi file: tránh tích lũy query engine native trong worker (D44).
    setupFiles: ['./tests/setup/disconnect-prisma.ts'],
    env: { DATABASE_URL: resolveTestDatabaseUrl(), NODE_ENV: 'test' },
    // Các file test dùng chung một DB nên chạy tuần tự.
    fileParallelism: false,
    sequence: { sequencer: AlphaSequencer },
    // Mỗi file một tiến trình Node mới, chạy tuần tự (D44 thay D41). Query engine native của Prisma tích lũy
    // trong một worker dùng chung làm Node sập ngắt quãng (0xC0000409 với threads, ERR_IPC_CHANNEL_CLOSED với
    // forks dùng chung). Tiến trình riêng cho mỗi file loại bỏ tích lũy và cô lập sự cố vào đúng file đó.
    pool: 'forks',
    poolOptions: { forks: { isolate: true, singleFork: false, minForks: 1, maxForks: 1 } },
    testTimeout: 30000,
    hookTimeout: 60000,
    exclude: ['**/node_modules/**', 'mobile/**', 'client/**'],
  },
});
