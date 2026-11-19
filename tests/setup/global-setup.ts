import { execSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from './test-db';

/** Tạo DB test nếu chưa có, áp migration và seed sạch một lần trước toàn bộ test (D41). */
export default function globalSetup(): void {
  const url = resolveTestDatabaseUrl();
  const env = { ...process.env, DATABASE_URL: url, NODE_ENV: 'test' };
  const run = (cmd: string) => execSync(cmd, { env, stdio: ['ignore', 'ignore', 'inherit'] });
  run('node scripts/db/ensure-database.mjs');
  run('npx prisma migrate deploy');
  run('npx tsx prisma/seed.ts');
}
