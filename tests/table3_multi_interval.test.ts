import { describe, it, expect } from 'vitest';
import {
  convertToGrams,
  verifyTable3Specifications,
  verifyMultiIntervalRanges,
} from '../src/metrology/calculations/weighing';
import { Decimal, roundMetrological, formatDecimal } from '../src/metrology/units/decimal';

describe('OIML R 76-1:2006 Clause 3.1.2 Table 3 - Metrological Specifications', () => {
  describe('Unit Conversions for Table 3', () => {
    it('should convert units to grams accurately', () => {
      expect(convertToGrams(1, 'mg')).toBeCloseTo(0.001, 6);
      expect(convertToGrams(1, 'g')).toBe(1);
      expect(convertToGrams(1, 'kg')).toBe(1000);
      expect(convertToGrams(1, 't')).toBe(1000000);
      expect(convertToGrams(1, 'lb')).toBeCloseTo(453.59237, 5);
      expect(convertToGrams(1, 'oz')).toBeCloseTo(28.349523, 5);
    });
  });

  describe('Single-Interval Table 3 Verification', () => {
    it('should pass valid Class III platform scale', () => {
      // Max = 150 kg, e = 0.05 kg = 50 g (>= 5 g -> minN = 500, maxN = 10000, Min = 20e = 1 kg)
      // n = 150 / 0.05 = 3000 (valid)
      const check = verifyTable3Specifications({
        accuracyClass: 'CLASS_III',
        verificationScaleIntervalE: 0.05,
        maxCapacity: 150,
        minCapacity: 1.0,
        unit: 'kg',
      });

      expect(check.isValid).toBe(true);
      expect(check.numberOfIntervalsN).toBe(3000);
      expect(check.minAllowedN).toBe(500);
      expect(check.maxAllowedN).toBe(10000);
    });

    it('should fail when number of intervals n exceeds max limit', () => {
      // Class III with n = 15000 > 10000
      const check = verifyTable3Specifications({
        accuracyClass: 'CLASS_III',
        verificationScaleIntervalE: 0.01,
        maxCapacity: 150,
        minCapacity: 1.0,
        unit: 'kg',
      });

      expect(check.isValid).toBe(false);
      expect(check.numberOfIntervalsN).toBe(15000);
      expect(check.failureReasons.some((r) => r.includes('exceeds maximum limit'))).toBe(true);
    });

    it('should fail when minimum capacity is below mandatory threshold', () => {
      // Min = 0.5 kg < 20e = 1.0 kg
      const check = verifyTable3Specifications({
        accuracyClass: 'CLASS_III',
        verificationScaleIntervalE: 0.05,
        maxCapacity: 150,
        minCapacity: 0.5,
        unit: 'kg',
      });

      expect(check.isValid).toBe(false);
      expect(check.failureReasons.some((r) => r.includes('Minimum capacity Min'))).toBe(true);
    });
  });

  describe('Multi-Interval Instruments (Clause 3.4.1)', () => {
    it('should pass compliant multi-interval configuration (e2 >= 2 * e1)', () => {
      // Range 1: Max1 = 6 kg, e1 = 2 g (n1 = 3000)
      // Range 2: Max2 = 15 kg, e2 = 5 g (n2 = 3000, e2/e1 = 2.5 >= 2)
      const result = verifyMultiIntervalRanges(
        'CLASS_III',
        [
          { rangeIndex: 1, maxCapacityI: 6000, verificationScaleIntervalEI: 2 },
          { rangeIndex: 2, maxCapacityI: 15000, verificationScaleIntervalEI: 5 },
        ],
        'g'
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when interval step ratio is less than 2', () => {
      // e1 = 2 g, e2 = 3 g -> ratio = 1.5 < 2
      const result = verifyMultiIntervalRanges(
        'CLASS_III',
        [
          { rangeIndex: 1, maxCapacityI: 6000, verificationScaleIntervalEI: 2 },
          { rangeIndex: 2, maxCapacityI: 15000, verificationScaleIntervalEI: 3 },
        ],
        'g'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((err) => err.includes('must be at least 2'))).toBe(true);
    });
  });
});

describe('Decimal Precision & Metrological Rounding (GUM / OIML A.4.4.1)', () => {
  it('should perform round-half-up metrological rounding accurately', () => {
    expect(roundMetrological(1.2345, 3)).toBe(1.235);
    expect(roundMetrological(1.2344, 3)).toBe(1.234);
    expect(roundMetrological(1.5, 0)).toBe(2);
    expect(roundMetrological(2.5, 0)).toBe(3);
  });

  it('should format decimal strings with explicit digits', () => {
    expect(formatDecimal(new Decimal(0.5), 3)).toBe('0.500');
    expect(formatDecimal(12.34567, 4)).toBe('12.3457');
  });
});
