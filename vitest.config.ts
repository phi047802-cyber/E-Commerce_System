import { defineConfig } from 'vitest/config';
import { resolveTestDatabaseUrl } from './tests/setup/test-db';
import AlphaSequencer from './tests/setup/alpha-sequencer';

export default defineConfig({
  test: {
    // Test chạy trên DB SQL Server riêng `<db>_test`, migrate + seed một lần ở globalSetup (D41).
    globalSetup: ['./tests/setup/global-setup.ts'],
    env: { DATABASE_URL: resolveTestDatabaseUrl(), NODE_ENV: 'test' },
    // Các file test dùng chung một DB nên chạy tuần tự.
    fileParallelism: false,
    sequence: { sequencer: AlphaSequencer },
    // Worker thread duy nhất (không dùng child_process): pool 'forks' trên Node 24 + Windows bị lỗi
    // tinypool `ERR_IPC_CHANNEL_CLOSED` ngắt quãng (D41).
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 30000,
    hookTimeout: 60000,
    exclude: ['**/node_modules/**', 'mobile/**', 'client/**'],
  },
});
