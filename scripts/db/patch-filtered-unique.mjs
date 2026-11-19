// D34: SQL Server cho phép UNIQUE với tối đa 1 giá trị NULL. Prisma chưa hỗ trợ filtered index,
// nên sau khi sinh migration bằng `prisma migrate diff`, script này thay các UNIQUE constraint
// trên cột nullable bằng filtered unique index (WHERE col IS NOT NULL).
// Dùng: node scripts/db/patch-filtered-unique.mjs <path/to/migration.sql>
import fs from 'node:fs';

const TARGETS = [
  ['users', 'google_id'],
  ['payments', 'txn_id'],
  ['withdrawal_requests', 'txn_id'],
  ['withdrawal_requests', 'idempotency_key'],
];

const file = process.argv[2];
if (!file) { console.error('Thiếu đường dẫn migration.sql'); process.exit(1); }
let sql = fs.readFileSync(file, 'utf8');
const extra = [];
for (const [table, col] of TARGETS) {
  const name = `${table}_${col}_key`;
  const re = new RegExp(String.raw`,?\s*\n\s*CONSTRAINT \[${name}\] UNIQUE NONCLUSTERED \(\[${col}\]\)(,?)`);
  const m = sql.match(re);
  if (!m) { console.log(`skip ${name} (không có trong migration này)`); continue; }
  sql = sql.slice(0, m.index) + (m[1] === ',' ? ',' : '') + sql.slice(m.index + m[0].length);
  extra.push(`-- D34: filtered unique index thay cho UNIQUE constraint trên cột nullable\nCREATE UNIQUE NONCLUSTERED INDEX [${name}] ON [dbo].[${table}]([${col}]) WHERE [${col}] IS NOT NULL;\n`);
}
const idx = sql.lastIndexOf('COMMIT TRAN;');
sql = sql.slice(0, idx) + extra.join('\n') + '\n' + sql.slice(idx);
fs.writeFileSync(file, sql);
console.log(`patched ${extra.length} filtered unique index(es) in ${file}`);
