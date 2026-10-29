import { describe, it, expect } from 'vitest';
import {
  calculate8812Settlement,
  calculateCancellationRefund,
  calculateDisputeSettlement,
} from '../../server/src/common/financialMath.js';

describe('Unit Tests: Financial Math & Integer VND Invariants (P0, BR-04, BR-11, BR-15, TC54)', () => {
  describe('88/12 Settlement Calculation (BR-15, D13)', () => {
    it('should accurately split standard 200.000 VND into 88% Companion and 12% Platform', () => {
      const result = calculate8812Settlement(200000);
      expect(result.platformFee).toBe(24000);
      expect(result.companionFee).toBe(176000);
      expect(result.platformFee + result.companionFee).toBe(200000);
    });

    it('should handle odd and prime VND values with zero-cent rounding (no cent loss)', () => {
      const oddAmounts = [1, 3, 7, 13, 99999, 100001, 234567, 999999];
      for (const amount of oddAmounts) {
        const result = calculate8812Settlement(amount);
        expect(Number.isInteger(result.platformFee)).toBe(true);
        expect(Number.isInteger(result.companionFee)).toBe(true);
        expect(result.platformFee + result.companionFee).toBe(amount);
      }
    });

    it('should throw error for negative fee amounts', () => {
      expect(() => calculate8812Settlement(-50000)).toThrow('Total fee cannot be negative');
    });

    it('Property test: Invariant (companionFee + platformFee === totalFee) holds for 1000 random values', () => {
      for (let i = 0; i < 1000; i++) {
        // Random fee between 0 and 1.000.000.000 VND
        const randomFee = Math.floor(Math.random() * 1000000000);
        const result = calculate8812Settlement(randomFee);
        expect(result.companionFee + result.platformFee).toBe(randomFee);
        expect(result.platformFee).toBeGreaterThanOrEqual(0);
        expect(result.companionFee).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Cancellation Policy Calculation (BR-10, BR-11, BR-12, TC40-TC43)', () => {
    const fee = 100000;

    it('Boundary >= 30m: 100% refund to Renter, 0% compensation to Companion', () => {
      const at30m = calculateCancellationRefund(fee, 30);
      expect(at30m.policyApplied).toBe('CANCEL_GE_30M');
      expect(at30m.renterRefund).toBe(100000);
      expect(at30m.companionCompensation).toBe(0);
      expect(at30m.platformFee).toBe(0);

      const at45m = calculateCancellationRefund(fee, 45);
      expect(at45m.policyApplied).toBe('CANCEL_GE_30M');
      expect(at45m.renterRefund).toBe(100000);
    });

    it('Boundary 10m to 29m: 70% refund to Renter, 30% compensation to Companion', () => {
      const at10m = calculateCancellationRefund(fee, 10);
      expect(at10m.policyApplied).toBe('CANCEL_10_30M');
      expect(at10m.renterRefund).toBe(70000);
      expect(at10m.companionCompensation).toBe(30000);
      expect(at10m.platformFee).toBe(0);

      const at29m = calculateCancellationRefund(fee, 29);
      expect(at29m.policyApplied).toBe('CANCEL_10_30M');
      expect(at29m.renterRefund).toBe(70000);
      expect(at29m.companionCompensation).toBe(30000);
    });

    it('Boundary < 10m: 100% penalty (88% Companion, 12% Platform, 0% Renter)', () => {
      const at9m = calculateCancellationRefund(fee, 9);
      expect(at9m.policyApplied).toBe('CANCEL_LT_10M');
      expect(at9m.renterRefund).toBe(0);
      expect(at9m.companionCompensation).toBe(88000);
      expect(at9m.platformFee).toBe(12000);

      const at0m = calculateCancellationRefund(fee, 0);
      expect(at0m.policyApplied).toBe('CANCEL_LT_10M');
      expect(at0m.renterRefund).toBe(0);
      expect(at0m.companionCompensation).toBe(88000);
      expect(at0m.platformFee).toBe(12000);
    });

    it('Property test: Conservation of funds (renterRefund + companionComp + platformFee === totalFee) over 1000 random inputs', () => {
      for (let i = 0; i < 1000; i++) {
        const randomFee = Math.floor(Math.random() * 5000000);
        const randomMinutes = Math.floor(Math.random() * 120) - 10; // -10 to 110 mins
        const result = calculateCancellationRefund(randomFee, randomMinutes);

        expect(
          result.renterRefund + result.companionCompensation + result.platformFee
        ).toBe(randomFee);
        expect(result.renterRefund).toBeGreaterThanOrEqual(0);
        expect(result.companionCompensation).toBeGreaterThanOrEqual(0);
        expect(result.platformFee).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Dispute RMA Settlement Calculation (BR-17, BR-18, TC51, TC52)', () => {
    const fee = 500000;

    it('Fault >= 80%: 100% refund to Renter, 0% to Companion/Platform, direct penalty flag set', () => {
      const result80 = calculateDisputeSettlement(fee, 80);
      expect(result80.renterRefund).toBe(500000);
      expect(result80.companionPayout).toBe(0);
      expect(result80.platformFee).toBe(0);
      expect(result80.applyDirectPenalty).toBe(true);

      const result100 = calculateDisputeSettlement(fee, 100);
      expect(result100.renterRefund).toBe(500000);
      expect(result100.companionPayout).toBe(0);
      expect(result100.platformFee).toBe(0);
      expect(result100.applyDirectPenalty).toBe(true);
    });

    it('Fault === 0%: 0% refund to Renter, normal 88/12 split to Companion and Platform', () => {
      const result0 = calculateDisputeSettlement(fee, 0);
      expect(result0.renterRefund).toBe(0);
      expect(result0.companionPayout).toBe(440000);
      expect(result0.platformFee).toBe(60000);
      expect(result0.applyDirectPenalty).toBe(false);
    });

    it('Intermediate fault (e.g. 50%): splits proportional and preserves exact integer sum', () => {
      const result50 = calculateDisputeSettlement(fee, 50);
      expect(result50.renterRefund).toBe(250000);
      expect(result50.companionPayout + result50.platformFee).toBe(250000);
      expect(result50.renterRefund + result50.companionPayout + result50.platformFee).toBe(fee);
      expect(result50.applyDirectPenalty).toBe(false);
    });

    it('Property test: Conservation of total escrow in dispute resolution across 1000 random inputs', () => {
      for (let i = 0; i < 1000; i++) {
        const randomFee = Math.floor(Math.random() * 10000000);
        const randomFault = Math.floor(Math.random() * 101); // 0 to 100%
        const result = calculateDisputeSettlement(randomFee, randomFault);

        expect(
          result.renterRefund + result.companionPayout + result.platformFee
        ).toBe(randomFee);
      }
    });
  });
});
