import { describe, it, expect } from 'vitest';
import { calculateWeighingError } from '../src/metrology/calculations/weighing';

describe('OIML R 76-1:2006 Clause A.4.4.3 - Turning Point (Flash Point) Error Calculations', () => {
  it('should calculate exact zero error when indication perfectly matches load and delta L is 0.5 e', () => {
    // L = 1000 g, e = 1 g, I = 1000 g, ΔL = 0.5 g, E0 = 0
    // P = 1000 + 0.5*1 - 0.5 = 1000
    // E = 1000 - 1000 = 0
    // Ec = 0 - 0 = 0
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 1000,
      indicatedValueI: 1000,
      turningPointDeltaL: 0.5,
      zeroErrorE0: 0,
      unit: 'g',
    });

    expect(result.calculatedIndicationP).toBe(1000);
    expect(result.errorPriorToRoundingE).toBe(0);
    expect(result.correctedErrorEc).toBe(0);
    expect(result.mpeInUnit).toBe(1.0); // 1000 e is in zone 2 (500 < m <= 2000) -> MPE = 1.0 e
    expect(result.compliance).toBe('PASS');
  });

  it('should calculate positive error accurately', () => {
    // L = 200 g, e = 1 g, I = 200 g, ΔL = 0.2 g (turned early -> scale is reading high)
    // P = 200 + 0.5 - 0.2 = 200.3 g
    // E = 200.3 - 200 = +0.3 g
    // Ec = +0.3 - 0 = +0.3 g
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 200,
      indicatedValueI: 200,
      turningPointDeltaL: 0.2,
      zeroErrorE0: 0,
      unit: 'g',
    });

    expect(result.calculatedIndicationP).toBeCloseTo(200.3, 5);
    expect(result.errorPriorToRoundingE).toBeCloseTo(0.3, 5);
    expect(result.correctedErrorEc).toBeCloseTo(0.3, 5);
    expect(result.mpeInUnit).toBe(0.5); // 200 e <= 500 e -> MPE = 0.5 e
    expect(result.compliance).toBe('PASS'); // 0.3 <= 0.5
  });

  it('should calculate negative error accurately', () => {
    // L = 200 g, e = 1 g, I = 200 g, ΔL = 0.8 g (scale reading low)
    // P = 200 + 0.5 - 0.8 = 199.7 g
    // E = 199.7 - 200 = -0.3 g
    // Ec = -0.3 - 0 = -0.3 g
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 200,
      indicatedValueI: 200,
      turningPointDeltaL: 0.8,
      zeroErrorE0: 0,
      unit: 'g',
    });

    expect(result.calculatedIndicationP).toBeCloseTo(199.7, 5);
    expect(result.errorPriorToRoundingE).toBeCloseTo(-0.3, 5);
    expect(result.correctedErrorEc).toBeCloseTo(-0.3, 5);
    expect(result.compliance).toBe('PASS'); // |-0.3| <= 0.5
  });

  it('should subtract zero error E0 according to Clause 3.5.3.2', () => {
    // L = 500 kg, e = 0.5 kg, I = 500 kg, ΔL = 0.25 kg -> E = 0
    // If E0 = +0.2 kg -> Ec = E - E0 = 0 - (+0.2) = -0.2 kg
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 0.5,
      nominalLoadL: 500,
      indicatedValueI: 500,
      turningPointDeltaL: 0.25,
      zeroErrorE0: 0.2,
      unit: 'kg',
    });

    expect(result.errorPriorToRoundingE).toBeCloseTo(0, 5);
    expect(result.correctedErrorEc).toBeCloseTo(-0.2, 5);
    expect(result.compliance).toBe('PASS');
  });

  it('should pass at exact positive MPE limit boundary', () => {
    // Load in Zone 1 (MPE = 0.5 e = 0.5 kg)
    // Ec = +0.5000 kg -> PASS
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 400,
      indicatedValueI: 400,
      turningPointDeltaL: 0.0, // P = 400.5, E = +0.5
      zeroErrorE0: 0,
      unit: 'kg',
    });

    expect(result.correctedErrorEc).toBeCloseTo(0.5, 5);
    expect(result.mpeInUnit).toBe(0.5);
    expect(result.compliance).toBe('PASS');
  });

  it('should fail just above positive MPE limit boundary', () => {
    // Load in Zone 1 (MPE = 0.5 e = 0.5 kg)
    // E = +0.501 kg -> FAIL
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 400,
      indicatedValueI: 401,
      turningPointDeltaL: 0.999, // P = 401 + 0.5 - 0.999 = 400.501, E = +0.501
      zeroErrorE0: 0,
      unit: 'kg',
    });

    expect(result.correctedErrorEc).toBeCloseTo(0.501, 5);
    expect(result.mpeInUnit).toBe(0.5);
    expect(result.compliance).toBe('FAIL');
  });

  it('should pass at exact negative MPE limit boundary', () => {
    // Ec = -0.5000 kg -> PASS
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 400,
      indicatedValueI: 399,
      turningPointDeltaL: 0.0, // P = 399.5, E = -0.5
      zeroErrorE0: 0,
      unit: 'kg',
    });

    expect(result.correctedErrorEc).toBeCloseTo(-0.5, 5);
    expect(result.mpeInUnit).toBe(0.5);
    expect(result.compliance).toBe('PASS');
  });

  it('should fail just below negative MPE limit boundary', () => {
    // Ec = -0.501 kg -> FAIL
    const result = calculateWeighingError({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      nominalLoadL: 400,
      indicatedValueI: 399,
      turningPointDeltaL: 0.001, // P = 399.499, E = -0.501
      zeroErrorE0: 0,
      unit: 'kg',
    });

    expect(result.correctedErrorEc).toBeCloseTo(-0.501, 5);
    expect(result.mpeInUnit).toBe(0.5);
    expect(result.compliance).toBe('FAIL');
  });
});
