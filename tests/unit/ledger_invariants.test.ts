import { describe, it, expect } from 'vitest';
import {
  verifyJournalDebitCreditEquality,
  ensureAvailableBalanceNonNegative,
  LedgerEntryMath,
  calculate8812Settlement,
  calculateCancellationRefund,
} from '../../server/src/common/financialMath.js';

describe('Unit Tests: Ledger Double-Entry Invariants & Money Conservation (P0, BR-05, BR-06, TC10, TC13, TC25, TC26, TC53)', () => {
  describe('Double-Entry Journal Invariant: Debit == Credit', () => {
    it('should validate a balanced 2-entry journal (Hold Escrow / Refund)', () => {
      const entries: LedgerEntryMath[] = [
        { wallet_id: 'w-renter', direction: 'DEBIT', balance_type: 'AVAILABLE', amount: 500000 },
        { wallet_id: 'w-renter', direction: 'CREDIT', balance_type: 'ESCROW', amount: 500000 },
      ];
      expect(verifyJournalDebitCreditEquality(entries)).toBe(true);
    });

    it('should validate a balanced 3-entry journal (88/12 Settlement)', () => {
      const split = calculate8812Settlement(250000); // 220000 Companion, 30000 Platform
      const entries: LedgerEntryMath[] = [
        { wallet_id: 'w-renter', direction: 'DEBIT', balance_type: 'ESCROW', amount: 250000 },
        { wallet_id: 'w-companion', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: split.companionFee },
        { wallet_id: 'w-platform', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: split.platformFee },
      ];
      expect(verifyJournalDebitCreditEquality(entries)).toBe(true);
    });

    it('should reject an unbalanced journal by even 1 VND discrepancy', () => {
      const entries: LedgerEntryMath[] = [
        { wallet_id: 'w-renter', direction: 'DEBIT', balance_type: 'ESCROW', amount: 100000 },
        { wallet_id: 'w-companion', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: 99999 },
      ];
      expect(verifyJournalDebitCreditEquality(entries)).toBe(false);
    });

    it('should reject negative amounts in journal entries', () => {
      const entries: LedgerEntryMath[] = [
        { wallet_id: 'w-1', direction: 'DEBIT', balance_type: 'AVAILABLE', amount: -50000 },
        { wallet_id: 'w-2', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: -50000 },
      ];
      expect(() => verifyJournalDebitCreditEquality(entries)).toThrow('Negative entry amount detected');
    });

    it('Property test: Random journal generator (1000 trials) ensures Debit === Credit verification is exact', () => {
      for (let i = 0; i < 1000; i++) {
        const totalAmount = Math.floor(Math.random() * 10000000) + 1;
        const part1 = Math.floor(totalAmount * Math.random());
        const part2 = totalAmount - part1;

        const balancedEntries: LedgerEntryMath[] = [
          { wallet_id: 'w-debit', direction: 'DEBIT', balance_type: 'AVAILABLE', amount: totalAmount },
          { wallet_id: 'w-cred-1', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: part1 },
          { wallet_id: 'w-cred-2', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: part2 },
        ];
        expect(verifyJournalDebitCreditEquality(balancedEntries)).toBe(true);

        // Intentionally tamper with part2 by 1 VND
        const tamperedEntries: LedgerEntryMath[] = [
          { wallet_id: 'w-debit', direction: 'DEBIT', balance_type: 'AVAILABLE', amount: totalAmount },
          { wallet_id: 'w-cred-1', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: part1 },
          { wallet_id: 'w-cred-2', direction: 'CREDIT', balance_type: 'AVAILABLE', amount: part2 + 1 },
        ];
        expect(verifyJournalDebitCreditEquality(tamperedEntries)).toBe(false);
      }
    });
  });

  describe('Available Balance Non-Negative Invariant', () => {
    it('allows debiting up to the exact available balance, leaving 0', () => {
      const result = ensureAvailableBalanceNonNegative(500000, 500000);
      expect(result).toBe(0);
    });

    it('allows debiting less than available balance', () => {
      const result = ensureAvailableBalanceNonNegative(500000, 200000);
      expect(result).toBe(300000);
    });

    it('throws INSUFFICIENT_BALANCE error when debiting more than available balance', () => {
      expect(() => ensureAvailableBalanceNonNegative(500000, 500001)).toThrow(
        /INSUFFICIENT_BALANCE/
      );
    });

    it('rejects negative debit amounts', () => {
      expect(() => ensureAvailableBalanceNonNegative(500000, -10000)).toThrow(
        'Debit amount cannot be negative'
      );
    });

    it('Property test: Random balance vs debit operations (1000 trials)', () => {
      for (let i = 0; i < 1000; i++) {
        const balance = Math.floor(Math.random() * 10000000);
        const debit = Math.floor(Math.random() * 10000000);

        if (debit <= balance) {
          const next = ensureAvailableBalanceNonNegative(balance, debit);
          expect(next).toBe(balance - debit);
          expect(next).toBeGreaterThanOrEqual(0);
        } else {
          expect(() => ensureAvailableBalanceNonNegative(balance, debit)).toThrow(
            /INSUFFICIENT_BALANCE/
          );
        }
      }
    });
  });

  describe('Closed Economy: Total Money Conservation Invariant Across System Lifecycle', () => {
    it('Invariant holds across a simulated lifecycle of 500 sequential financial events', () => {
      // Setup state for closed virtual economy
      let renterAvailable = 0;
      let renterEscrow = 0;
      let companionAvailable = 0;
      let platformRevenue = 0;
      let clearingReserved = 0;

      let totalExternalDeposits = 0;
      let totalExternalPayouts = 0;

      const verifyConservation = () => {
        const totalInternalFunds =
          renterAvailable +
          renterEscrow +
          companionAvailable +
          platformRevenue +
          clearingReserved;
        const netExternalFlow = totalExternalDeposits - totalExternalPayouts;
        expect(totalInternalFunds).toBe(netExternalFlow);
      };

      for (let step = 0; step < 500; step++) {
        const actionType = Math.floor(Math.random() * 6);

        switch (actionType) {
          case 0: {
            // Top-up deposit into Renter wallet
            const deposit = (Math.floor(Math.random() * 10) + 1) * 50000; // 50k to 500k
            renterAvailable += deposit;
            totalExternalDeposits += deposit;
            break;
          }
          case 1: {
            // Escrow hold
            const bookingFee = 100000;
            if (renterAvailable >= bookingFee) {
              renterAvailable -= bookingFee;
              renterEscrow += bookingFee;
            }
            break;
          }
          case 2: {
            // Escrow 88/12 settlement
            const bookingFee = 100000;
            if (renterEscrow >= bookingFee) {
              const split = calculate8812Settlement(bookingFee);
              renterEscrow -= bookingFee;
              companionAvailable += split.companionFee;
              platformRevenue += split.platformFee;
            }
            break;
          }
          case 3: {
            // Escrow 100% refund (e.g. Companion rejection or 180s timeout)
            const bookingFee = 100000;
            if (renterEscrow >= bookingFee) {
              renterEscrow -= bookingFee;
              renterAvailable += bookingFee;
            }
            break;
          }
          case 4: {
            // Cancellation at 10-30m boundary (70% Renter, 30% Companion)
            const bookingFee = 100000;
            if (renterEscrow >= bookingFee) {
              const split = calculateCancellationRefund(bookingFee, 15);
              renterEscrow -= bookingFee;
              renterAvailable += split.renterRefund;
              companionAvailable += split.companionCompensation;
            }
            break;
          }
          case 5: {
            // Withdrawal: Reserve -> Payout
            const withdrawAmount = 50000;
            if (companionAvailable >= withdrawAmount) {
              // 1. Reserve
              companionAvailable -= withdrawAmount;
              clearingReserved += withdrawAmount;
              // 2. Complete Payout
              clearingReserved -= withdrawAmount;
              totalExternalPayouts += withdrawAmount;
            }
            break;
          }
        }

        // Verify equation at each and every single step
        verifyConservation();
      }
    });
  });
});
