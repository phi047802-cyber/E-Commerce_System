/**
 * INSTASQUAD — Pure Financial Mathematics & Invariant Verification Utility
 * 
 * Toàn bộ hàm tính toán số học tài chính dùng số nguyên VND (zero-cent rounding).
 * Không làm tròn số thập phân gây thất thoát tiền tệ.
 * Cung cấp các hàm kiểm chứng bất biến (Invariants) cho Sổ cái kép.
 */

export interface Settlement8812Result {
  totalFee: number;
  companionFee: number;
  platformFee: number;
}

export interface CancellationRefundResult {
  totalFee: number;
  renterRefund: number;
  companionCompensation: number;
  platformFee: number;
  policyApplied: 'CANCEL_GE_30M' | 'CANCEL_10_30M' | 'CANCEL_LT_10M';
}

export interface DisputeSettlementResult {
  totalFee: number;
  faultPercent: number;
  renterRefund: number;
  companionPayout: number;
  platformFee: number;
  applyDirectPenalty: boolean;
}

export interface TrustScoreResult {
  rawScore: number;
  clampedScore: number;
  isSuspended: boolean;
}

export interface LedgerEntryMath {
  wallet_id: string;
  direction: 'DEBIT' | 'CREDIT';
  balance_type: 'AVAILABLE' | 'ESCROW';
  amount: number;
}

/**
 * 1. Quyết toán 88/12 chuẩn hóa (BR-15, D13)
 * Platform = floor(totalFee * 0.12)
 * Companion = totalFee - platformFee
 * Invariant: platformFee + companionFee === totalFee
 */
export function calculate8812Settlement(totalFee: number): Settlement8812Result {
  if (totalFee < 0) {
    throw new Error('Total fee cannot be negative');
  }
  const integerFee = Math.floor(totalFee);
  const platformFee = Math.floor(integerFee * 0.12);
  const companionFee = integerFee - platformFee;

  return {
    totalFee: integerFee,
    companionFee,
    platformFee,
  };
}

/**
 * 2. Phân rã hoàn tiền khi hủy trước giờ (BR-10, BR-11, BR-12)
 * - deltaMinutes >= 30: Hoàn 100% cho Renter
 * - 10 <= deltaMinutes < 30: Hoàn 70% Renter, 30% Companion
 * - deltaMinutes < 10: Phạt 100% (88% Companion, 12% Sàn)
 * Invariant: renterRefund + companionCompensation + platformFee === totalFee
 */
export function calculateCancellationRefund(
  totalFee: number,
  deltaMinutes: number
): CancellationRefundResult {
  if (totalFee < 0) {
    throw new Error('Total fee cannot be negative');
  }
  const integerFee = Math.floor(totalFee);

  if (deltaMinutes >= 30) {
    return {
      totalFee: integerFee,
      renterRefund: integerFee,
      companionCompensation: 0,
      platformFee: 0,
      policyApplied: 'CANCEL_GE_30M',
    };
  }

  if (deltaMinutes >= 10) {
    const renterRefund = Math.floor(integerFee * 0.70);
    const companionCompensation = integerFee - renterRefund;
    return {
      totalFee: integerFee,
      renterRefund,
      companionCompensation,
      platformFee: 0,
      policyApplied: 'CANCEL_10_30M',
    };
  }

  // < 10 phút: Phạt 100% (88% Companion, 12% Nền tảng)
  const platformFee = Math.floor(integerFee * 0.12);
  const companionCompensation = integerFee - platformFee;
  return {
    totalFee: integerFee,
    renterRefund: 0,
    companionCompensation,
    platformFee,
    policyApplied: 'CANCEL_LT_10M',
  };
}

/**
 * 3. Phân chia khiếu nại theo tỷ lệ lỗi (BR-17, BR-18, DEMO_POLICY)
 * - faultPercent >= 80%: Hoàn 100% cho Renter, trừ 10 điểm TrustScore Companion.
 * - faultPercent === 0%: Companion nhận 88%, Sàn 12%, Renter 0%.
 * - 0% < faultPercent < 80%: Renter nhận refund tương ứng faultPercent, phần còn lại giải ngân cho Companion.
 * Invariant: renterRefund + companionPayout + platformFee === totalFee
 */
export function calculateDisputeSettlement(
  totalFee: number,
  faultPercent: number
): DisputeSettlementResult {
  if (totalFee < 0) {
    throw new Error('Total fee cannot be negative');
  }
  if (faultPercent < 0 || faultPercent > 100) {
    throw new Error('Fault percent must be between 0 and 100');
  }
  const integerFee = Math.floor(totalFee);

  if (faultPercent >= 80) {
    return {
      totalFee: integerFee,
      faultPercent,
      renterRefund: integerFee,
      companionPayout: 0,
      platformFee: 0,
      applyDirectPenalty: true,
    };
  }

  if (faultPercent === 0) {
    const platformFee = Math.floor(integerFee * 0.12);
    const companionPayout = integerFee - platformFee;
    return {
      totalFee: integerFee,
      faultPercent,
      renterRefund: 0,
      companionPayout,
      platformFee,
      applyDirectPenalty: false,
    };
  }

  // Phân chia theo tỷ lệ trung gian (0 < faultPercent < 80)
  const renterRefund = Math.floor(integerFee * (faultPercent / 100));
  const remaining = integerFee - renterRefund;
  const platformFee = Math.floor(remaining * 0.12);
  const companionPayout = remaining - platformFee;

  return {
    totalFee: integerFee,
    faultPercent,
    renterRefund,
    companionPayout,
    platformFee,
    applyDirectPenalty: false,
  };
}

/**
 * 4. Công thức Điểm Uy tín TrustScore (BR-21, D07, DEMO_POLICY #7)
 * TrustScore = 0.40 * Rating100 + 0.40 * CompletionRate - 1.20 * DisputeRate - DirectPenalties
 * Bound: [0.00, 100.00]
 * Ngưỡng khóa: score < 40.0
 */
export function calculateTrustScore(
  rating100: number,
  completionRate: number,
  disputeRate: number,
  directPenalties: number = 0
): TrustScoreResult {
  const rawScore =
    0.40 * rating100 +
    0.40 * completionRate -
    1.20 * disputeRate -
    directPenalties;

  const clampedScore = Math.max(0.0, Math.min(100.0, Math.round(rawScore * 100) / 100));
  const isSuspended = clampedScore < 40.0;

  return {
    rawScore,
    clampedScore,
    isSuspended,
  };
}

/**
 * 5. Bất biến Sổ cái kép: Tổng Debit == Tổng Credit
 */
export function verifyJournalDebitCreditEquality(entries: LedgerEntryMath[]): boolean {
  if (!entries || entries.length === 0) return false;

  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    if (entry.amount < 0) {
      throw new Error(`Negative entry amount detected: ${entry.amount}`);
    }
    if (entry.direction === 'DEBIT') {
      totalDebit += entry.amount;
    } else if (entry.direction === 'CREDIT') {
      totalCredit += entry.amount;
    }
  }

  return totalDebit === totalCredit;
}

/**
 * 6. Bất biến Số dư Khả dụng Không Âm
 */
export function ensureAvailableBalanceNonNegative(
  currentBalance: number,
  debitAmount: number
): number {
  if (debitAmount < 0) {
    throw new Error('Debit amount cannot be negative');
  }
  const newBalance = currentBalance - debitAmount;
  if (newBalance < 0) {
    throw new Error(
      `INSUFFICIENT_BALANCE: Số dư khả dụng không đủ. Hiện có: ${currentBalance}, cần trừ: ${debitAmount}`
    );
  }
  return newBalance;
}
