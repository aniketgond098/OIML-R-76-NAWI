import { describe, it, expect } from 'vitest';
import { calculateRepeatability } from '../src/metrology/calculations/repeatability';

describe('OIML R 76-1:2006 Clause 3.6.1 & Clause A.4.10 - Repeatability Evaluation', () => {
  it('should return PASS when delta I is well within MPE', () => {
    // Load = 100 kg, e = 0.1 kg (1000 e -> Zone 2 -> MPE = 1.0 e = 0.1 kg)
    const result = calculateRepeatability({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 0.1,
      nominalLoadL: 100,
      unit: 'kg',
      readings: [
        { runIndex: 1, zeroIndication: 0, indicatedValue: 100.0 },
        { runIndex: 2, zeroIndication: 0, indicatedValue: 100.0 },
        { runIndex: 3, zeroIndication: 0, indicatedValue: 100.1 },
      ],
    });

    expect(result.maxIndication).toBe(100.1);
    expect(result.minIndication).toBe(100.0);
    expect(result.deltaI).toBeCloseTo(0.1, 5);
    expect(result.mpeInUnit).toBeCloseTo(0.1, 5);
    expect(result.compliance).toBe('PASS');
    expect(result.isSpanPass).toBe(true);
    expect(result.stdDeviation).toBeDefined();
  });

  it('should return PASS at exact boundary delta I == MPE', () => {
    const result = calculateRepeatability({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 0.1,
      nominalLoadL: 100,
      unit: 'kg',
      readings: [
        { runIndex: 1, zeroIndication: 0, indicatedValue: 100.0 },
        { runIndex: 2, zeroIndication: 0, indicatedValue: 100.05 },
        { runIndex: 3, zeroIndication: 0, indicatedValue: 100.1 },
      ],
    });

    expect(result.deltaI).toBeCloseTo(0.1, 5);
    expect(result.mpeInUnit).toBeCloseTo(0.1, 5);
    expect(result.compliance).toBe('PASS');
  });

  it('should return FAIL when delta I exceeds MPE by small margin', () => {
    const result = calculateRepeatability({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 0.1,
      nominalLoadL: 100,
      unit: 'kg',
      readings: [
        { runIndex: 1, zeroIndication: 0, indicatedValue: 99.95 },
        { runIndex: 2, zeroIndication: 0, indicatedValue: 100.0 },
        { runIndex: 3, zeroIndication: 0, indicatedValue: 100.1 },
      ],
    });

    expect(result.deltaI).toBeCloseTo(0.15, 5);
    expect(result.mpeInUnit).toBeCloseTo(0.1, 5);
    expect(result.compliance).toBe('FAIL');
    expect(result.isSpanPass).toBe(false);
  });

  it('should mark NOT_EVALUATED when fewer than 3 runs are recorded', () => {
    const result = calculateRepeatability({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 0.1,
      nominalLoadL: 100,
      unit: 'kg',
      readings: [
        { runIndex: 1, zeroIndication: 0, indicatedValue: 100.0 },
        { runIndex: 2, zeroIndication: 0, indicatedValue: 100.0 },
      ],
    });

    expect(result.compliance).toBe('NOT_EVALUATED');
  });
});
