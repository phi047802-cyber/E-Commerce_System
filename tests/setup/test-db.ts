import 'dotenv/config';

/**
 * Bộ test chạy trên database SQL Server RIÊNG (`<db>_test`) để không đụng dữ liệu dev
 * và không bị worker nền của server dev (đang chạy cùng lúc) can thiệp. Có thể ghi đè bằng TEST_DATABASE_URL.
 */
export function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('sqlserver://')) {
    throw new Error('DATABASE_URL phải là chuỗi sqlserver:// (xem .env.example) hoặc đặt TEST_DATABASE_URL.');
  }
  return url.replace(/;database=([^;]+)/i, (_m, name: string) => `;database=${name.endsWith('_test') ? name : `${name}_test`}`);
}
