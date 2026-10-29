export const SYSTEM_ACCOUNTS = {
  CLEARING_WALLET_ID: 'w-system-clearing',
  CLEARING_USER_ID: 'u-system-clearing',
  PLATFORM_REVENUE_WALLET_ID: 'w-platform-revenue',
  PLATFORM_REVENUE_USER_ID: 'u-system-platform',
} as const;

export type TransactionType =
  | 'TOPUP'
  | 'ESCROW_HOLD'
  | 'ESCROW_RELEASE'
  | 'ESCROW_REFUND'
  | 'CANCEL_PENALTY'
  | 'DISPUTE_SETTLE'
  | 'WITHDRAW_RESERVE'
  | 'WITHDRAW_SETTLE'
  | 'WITHDRAW_REJECT';

export type EntryDirection = 'DEBIT' | 'CREDIT';
export type BalanceType = 'AVAILABLE' | 'ESCROW';

export interface LedgerEntryInput {
  wallet_id: string;
  direction: EntryDirection;
  balance_type: BalanceType;
  amount: number; // Số nguyên VND > 0
}

export interface PostTransactionInput {
  txn_type: TransactionType | string;
  idempotency_key: string;
  booking_id?: string;
  escrow_id?: string;
  entries: LedgerEntryInput[];
}
