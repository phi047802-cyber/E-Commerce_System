// Tạo database SQL Server nếu chưa tồn tại (Prisma `migrate deploy` không tự tạo DB trên SQL Server).
// Đọc DATABASE_URL từ .env, kết nối vào `master` bằng Prisma Client tạm thời rồi chạy CREATE DATABASE.
// Chờ tối đa ~60 giây để container SQL Server khởi động xong.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('sqlserver://')) {
  console.error('DATABASE_URL phải là chuỗi kết nối sqlserver:// (xem .env.example).');
  process.exit(1);
}
const dbMatch = url.match(/;database=([^;]+)/i);
const dbName = dbMatch ? dbMatch[1] : 'instasquad';
if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
  console.error(`Tên database không hợp lệ: ${dbName}`);
  process.exit(1);
}
const masterUrl = url.replace(/;database=[^;]+/i, ';database=master');
const prisma = new PrismaClient({ datasources: { db: { url: masterUrl } } });

let lastErr;
for (let attempt = 1; attempt <= 30; attempt++) {
  try {
    await prisma.$executeRawUnsafe(`IF DB_ID(N'${dbName}') IS NULL CREATE DATABASE [${dbName}]`);
    console.log(`✔ SQL Server sẵn sàng, database [${dbName}] đã tồn tại hoặc vừa được tạo.`);
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    lastErr = err;
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await prisma.$disconnect();
console.error('✖ Không kết nối được SQL Server:', lastErr?.message ?? lastErr);
process.exit(1);
