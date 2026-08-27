import { describe, it, expect } from 'vitest';
import { calculateZeroSetting } from '../src/metrology/calculations/zeroSetting';
import { calculateTare } from '../src/metrology/calculations/tare';

describe('OIML R 76-1:2006 Clause 4.5.2 & A.4.2.3 - Zero-Setting Accuracy', () => {
  it('should pass with exact zero error E0 = 0 when delta L0 = 0.5 e', () => {
    // I0 = 0, e = 1 g, ΔL0 = 0.5 g -> E0 = 0 + 0.5 - 0.5 = 0
    const result = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.5,
      verificationScaleIntervalE: 1.0,
      unit: 'g',
    });

    expect(result.calculatedZeroErrorE0).toBe(0);
    expect(result.maxPermissibleZeroError).toBe(0.25);
    expect(result.isZeroAccuracyPass).toBe(true);
    expect(result.compliance).toBe('PASS');
  });

  it('should pass at exact positive boundary E0 = +0.25 e', () => {
    // I0 = 0, e = 1 g, ΔL0 = 0.25 g -> E0 = 0 + 0.5 - 0.25 = +0.25 g
    const result = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.25,
      verificationScaleIntervalE: 1.0,
      unit: 'g',
    });

    expect(result.calculatedZeroErrorE0).toBeCloseTo(0.25, 5);
    expect(result.compliance).toBe('PASS');
  });

  it('should pass at exact negative boundary E0 = -0.25 e', () => {
    // I0 = 0, e = 1 g, ΔL0 = 0.75 g -> E0 = 0 + 0.5 - 0.75 = -0.25 g
    const result = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.75,
      verificationScaleIntervalE: 1.0,
      unit: 'g',
    });

    expect(result.calculatedZeroErrorE0).toBeCloseTo(-0.25, 5);
    expect(result.compliance).toBe('PASS');
  });

  it('should fail just above boundary E0 = +0.26 e', () => {
    // ΔL0 = 0.24 g -> E0 = +0.26 g > 0.25 g
    const result = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.24,
      verificationScaleIntervalE: 1.0,
      unit: 'g',
    });

    expect(result.calculatedZeroErrorE0).toBeCloseTo(0.26, 5);
    expect(result.compliance).toBe('FAIL');
  });

  describe('Zero Setting Range (Clause 4.5.1)', () => {
    it('should pass non-automatic zero range <= 4% of Max', () => {
      const result = calculateZeroSetting({
        zeroIndicationI0: 0,
        turningPointDeltaL0: 0.5,
        verificationScaleIntervalE: 1.0,
        unit: 'g',
        testType: 'NON_AUTOMATIC',
        maxCapacity: 1000,
        maxZeroRangeLoadApplied: 38, // 3.8% <= 4%
      });

      expect(result.zeroRangePercentMax).toBeCloseTo(3.8, 2);
      expect(result.isZeroRangePass).toBe(true);
      expect(result.compliance).toBe('PASS');
    });

    it('should fail non-automatic zero range > 4% of Max', () => {
      const result = calculateZeroSetting({
        zeroIndicationI0: 0,
        turningPointDeltaL0: 0.5,
        verificationScaleIntervalE: 1.0,
        unit: 'g',
        testType: 'NON_AUTOMATIC',
        maxCapacity: 1000,
        maxZeroRangeLoadApplied: 45, // 4.5% > 4%
      });

      expect(result.zeroRangePercentMax).toBeCloseTo(4.5, 2);
      expect(result.isZeroRangePass).toBe(false);
      expect(result.compliance).toBe('FAIL');
    });

    it('should allow up to 20% for INITIAL_ZERO_SETTING', () => {
      const result = calculateZeroSetting({
        zeroIndicationI0: 0,
        turningPointDeltaL0: 0.5,
        verificationScaleIntervalE: 1.0,
        unit: 'g',
        testType: 'INITIAL_ZERO_SETTING',
        maxCapacity: 1000,
        maxZeroRangeLoadApplied: 180, // 18% <= 20%
      });

      expect(result.zeroRangePercentMax).toBe(18);
      expect(result.isZeroRangePass).toBe(true);
      expect(result.compliance).toBe('PASS');
    });
  });
});

describe('OIML R 76-1:2006 Clause 4.6.3 & Clause A.4.6 - Tare Device Accuracy', () => {
  it('should verify tare setting accuracy and net weighing points', () => {
    const result = calculateTare({
      tareLoadApplied: 50,
      indicatedTare: 50,
      turningPointDeltaLTare: 0.5, // E_tare = 50 + 0.5 - 0.5 - 50 = 0 <= 0.25 e
      verificationScaleIntervalE: 1.0,
      unit: 'g',
      accuracyClass: 'CLASS_III',
      netTestPoints: [
        {
          nominalNetLoad: 100,
          indicatedNet: 100,
          turningPointDeltaL: 0.5, // Ec_net = 0 <= 0.5 e (Zone 1)
        },
        {
          nominalNetLoad: 600,
          indicatedNet: 600,
          turningPointDeltaL: 0.5, // Ec_net = 0 <= 1.0 e (Zone 2)
        },
      ],
    });

    expect(result.calculatedTareError).toBe(0);
    expect(result.isTareAccuracyPass).toBe(true);
    expect(result.compliance).toBe('PASS');
  });

  it('should fail tare evaluation when tare setting error exceeds 0.25 e', () => {
    const result = calculateTare({
      tareLoadApplied: 50,
      indicatedTare: 50,
      turningPointDeltaLTare: 0.1, // E_tare = 50 + 0.5 - 0.1 - 50 = +0.4 g > 0.25 g
      verificationScaleIntervalE: 1.0,
      unit: 'g',
      accuracyClass: 'CLASS_III',
      netTestPoints: [
        {
          nominalNetLoad: 100,
          indicatedNet: 100,
          turningPointDeltaL: 0.5,
        },
      ],
    });

    expect(result.calculatedTareError).toBeCloseTo(0.4, 5);
    expect(result.isTareAccuracyPass).toBe(false);
    expect(result.compliance).toBe('FAIL');
  });
});
