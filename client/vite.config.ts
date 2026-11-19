import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  // Proxy tới Backend theo PORT trong .env ở thư mục gốc (mặc định 4000) — trước đây cố định 4000,
  // đổi PORT trong .env thì Web dev gọi nhầm server khác.
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const apiPort = process.env.PORT || rootEnv.PORT || '4000';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
        '/ws': {
          target: `ws://localhost:${apiPort}`,
          ws: true,
        },
        '/uploads': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
