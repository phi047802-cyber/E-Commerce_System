import { describe, it, expect } from 'vitest';
import { calculateTrustScore } from '../../server/src/common/financialMath.js';

describe('Unit Tests: TrustScore Engine & Hand Calculations (P0, BR-21, D07, TC58, TC59, TC60)', () => {
  it('Hand Calculation 1: New Companion Baseline (Rating=80, Completion=100%, Dispute=0%, Penalties=0)', () => {
    // 0.40 * 80 + 0.40 * 100 - 1.20 * 0 - 0 = 32 + 40 = 72.0
    const result = calculateTrustScore(80, 100, 0, 0);
    expect(result.rawScore).toBe(72.0);
    expect(result.clampedScore).toBe(72.0);
    expect(result.isSuspended).toBe(false);
  });

  it('Hand Calculation 2: Experienced Companion with 1 timeout penalty (Rating=100, Completion=95%, Dispute=5%, Penalties=3)', () => {
    // 0.40 * 100 + 0.40 * 95 - 1.20 * 5 - 3 = 40 + 38 - 6 - 3 = 69.0
    const result = calculateTrustScore(100, 95, 5, 3);
    expect(result.rawScore).toBe(69.0);
    expect(result.clampedScore).toBe(69.0);
    expect(result.isSuspended).toBe(false);
  });

  it('Hand Calculation 3: Severe dispute & penalty causing score to drop below 40.0 (Suspension Threshold)', () => {
    // Rating = 40 (2 stars), Completion = 60%, Dispute = 20%, Penalties = 13 (1 RMA + 1 timeout)
    // 0.40 * 40 + 0.40 * 60 - 1.20 * 20 - 13 = 16 + 24 - 24 - 13 = 3.0
    const result = calculateTrustScore(40, 60, 20, 13);
    expect(result.rawScore).toBe(3.0);
    expect(result.clampedScore).toBe(3.0);
    expect(result.isSuspended).toBe(true);
  });

  it('Exact boundary around 40.0 suspension threshold', () => {
    // Score exactly 40.0 -> NOT suspended
    // 0.40 * 50 + 0.40 * 50 - 1.20 * 0 - 0 = 20 + 20 = 40.0
    const at40 = calculateTrustScore(50, 50, 0, 0);
    expect(at40.clampedScore).toBe(40.0);
    expect(at40.isSuspended).toBe(false);

    // Score 39.99 -> SUSPENDED
    // 40.0 - 0.01 = 39.99
    const below40 = calculateTrustScore(50, 50, 0, 0.01);
    expect(below40.clampedScore).toBe(39.99);
    expect(below40.isSuspended).toBe(true);
  });

  it('Clamping test: Raw scores > 100 are clamped to 100.0, raw scores < 0 are clamped to 0.0', () => {
    // High theoretical score: Rating=120, Completion=120 -> 0.4*120 + 0.4*120 = 96 (or extreme inputs)
    const high = calculateTrustScore(150, 150, 0, 0);
    expect(high.rawScore).toBe(120.0);
    expect(high.clampedScore).toBe(100.0);

    // Negative raw score
    const negative = calculateTrustScore(0, 0, 50, 50);
    expect(negative.rawScore).toBe(-110.0);
    expect(negative.clampedScore).toBe(0.0);
    expect(negative.isSuspended).toBe(true);
  });

  it('Property test: Clamped score strictly in [0.00, 100.00] across 1000 randomized configurations', () => {
    for (let i = 0; i < 1000; i++) {
      const rating = Math.random() * 120; // 0 to 120
      const completion = Math.random() * 120; // 0 to 120%
      const dispute = Math.random() * 50; // 0 to 50%
      const penalties = Math.random() * 30; // 0 to 30 points

      const result = calculateTrustScore(rating, completion, dispute, penalties);

      expect(result.clampedScore).toBeGreaterThanOrEqual(0.0);
      expect(result.clampedScore).toBeLessThanOrEqual(100.0);
      expect(result.isSuspended).toBe(result.clampedScore < 40.0);

      // Verify at most 2 decimal places
      const decimalStr = result.clampedScore.toString().split('.')[1] || '';
      expect(decimalStr.length).toBeLessThanOrEqual(2);
    }
  });
});
