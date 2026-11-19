/**
 * Ledger Reconciliation trên SQL Server thật (G1, Bước 6).
 * 1. Truy vấn SQL thuần: mọi ledger_transaction phải có Σ DEBIT = Σ CREDIT.
 * 2. Gọi reconciliationService (cùng logic API Auditor) để đối chiếu số dư ví ↔ sổ cái, bảo toàn hệ thống, escrow.
 * Thoát mã 1 nếu phát hiện lệch. Chỉ đọc — không sửa dữ liệu.
 * Dùng: npm run ledger:reconcile
 */
import { prisma } from '../../server/src/common/prisma.js';
import { reconciliationService } from '../../server/src/modules/ledger/reconciliation.service.js';

async function main() {
  const [version] = await prisma.$queryRawUnsafe<{ v: string }[]>(
    "SELECT CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(64)) + N' ' + CAST(SERVERPROPERTY('Edition') AS NVARCHAR(128)) AS v"
  );
  console.log(`🗄️  SQL Server ${version.v}`);

  const unbalanced = await prisma.$queryRawUnsafe<{ txn_id: string; txn_type: string; debit: bigint | number; credit: bigint | number }[]>(`
    SELECT t.txn_id, t.txn_type,
           SUM(CASE WHEN e.direction = 'DEBIT'  THEN CAST(e.amount AS BIGINT) ELSE 0 END) AS debit,
           SUM(CASE WHEN e.direction = 'CREDIT' THEN CAST(e.amount AS BIGINT) ELSE 0 END) AS credit
    FROM dbo.ledger_transactions t
    JOIN dbo.ledger_entries e ON e.txn_id = t.txn_id
    GROUP BY t.txn_id, t.txn_type
    HAVING SUM(CASE WHEN e.direction = 'DEBIT' THEN CAST(e.amount AS BIGINT) ELSE 0 END)
        <> SUM(CASE WHEN e.direction = 'CREDIT' THEN CAST(e.amount AS BIGINT) ELSE 0 END)`);

  const [totals] = await prisma.$queryRawUnsafe<{ txns: number; entries: number; debit: bigint | number; credit: bigint | number }[]>(`
    SELECT (SELECT COUNT(*) FROM dbo.ledger_transactions) AS txns,
           COUNT(*) AS entries,
           COALESCE(SUM(CASE WHEN direction = 'DEBIT'  THEN CAST(amount AS BIGINT) ELSE 0 END), 0) AS debit,
           COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN CAST(amount AS BIGINT) ELSE 0 END), 0) AS credit
    FROM dbo.ledger_entries`);

  const debit = Number(totals.debit);
  const credit = Number(totals.credit);
  console.log(`📒 ${totals.txns} giao dịch / ${totals.entries} bút toán — Σ DEBIT = ${debit.toLocaleString('vi-VN')} đ, Σ CREDIT = ${credit.toLocaleString('vi-VN')} đ`);
  console.log(`   Giao dịch lệch debit ≠ credit: ${unbalanced.length}`);
  for (const u of unbalanced.slice(0, 20)) console.log(`   ✖ ${u.txn_id} (${u.txn_type}) debit=${u.debit} credit=${u.credit}`);

  const report = await reconciliationService.runReconciliation();
  console.log(`👛 Ví đã kiểm: ${report.total_wallets_checked}, lệch số dư ví↔sổ cái: ${report.wallet_mismatches.length}`);
  console.log(`⚖️  Phương trình bảo toàn hệ thống: chênh lệch ${report.system_conservation.equation_difference} → ${report.system_conservation.is_equation_satisfied ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
  console.log(`🔒 Escrow: chênh lệch ${report.escrow_audit.difference} → ${report.escrow_audit.is_escrow_aligned ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);

  const ok = unbalanced.length === 0 && debit === credit && report.is_balanced;
  console.log(ok ? '✅ RECONCILIATION PASS — Sổ cái cân bằng trên SQL Server.' : '❌ RECONCILIATION FAIL');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
