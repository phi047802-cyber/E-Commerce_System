import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false, // Chạy tuần tự các file test trên database SQLite local
    testTimeout: 15000,
  },
});
