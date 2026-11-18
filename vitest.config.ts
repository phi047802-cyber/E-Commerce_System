import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Các file test dùng chung một CSDL SQL Server thật (D33) nên phải chạy tuần tự.
    fileParallelism: false,
    // Một tiến trình fork duy nhất: tránh lỗi tinypool `ERR_IPC_CHANNEL_CLOSED` trên Node 24
    // khi tạo/hủy tiến trình con cho từng file.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000,
    hookTimeout: 60000,
    exclude: ['**/node_modules/**', 'mobile/**', 'client/**'],
  },
});
