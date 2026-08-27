import { describe, it, expect } from 'vitest';
import { calculateDiscrimination } from '../src/metrology/calculations/discrimination';
import { calculateTilting } from '../src/metrology/calculations/tilting';

describe('OIML R 76-1:2006 Clause 3.8 & Clause A.4.8 - Discrimination Test', () => {
  it('should calculate 1.4 d extra load and pass when indication increases by 1 d', () => {
    // d = 0.1 g, L = 500 g, I1 = 500.0 g, extra load = 0.14 g (1.4d), I2 = 500.1 g
    const result = calculateDiscrimination({
      nominalLoadL: 500,
      initialIndicationI1: 500.0,
      actualScaleIntervalD: 0.1,
      indicationAfterAdditionalLoadI2: 500.1,
      unit: 'g',
    });

    expect(result.extraLoadRequired).toBeCloseTo(0.14, 5);
    expect(result.indicationChangeDeltaI).toBeCloseTo(0.1, 5);
    expect(result.minimumRequiredChange).toBeCloseTo(0.1, 5);
    expect(result.compliance).toBe('PASS');
  });

  it('should fail when indication does not increase by at least 1.0 d', () => {
    // d = 0.1 g, I1 = 500.0 g, I2 = 500.0 g (no increment)
    const result = calculateDiscrimination({
      nominalLoadL: 500,
      initialIndicationI1: 500.0,
      actualScaleIntervalD: 0.1,
      indicationAfterAdditionalLoadI2: 500.0,
      unit: 'g',
    });

    expect(result.indicationChangeDeltaI).toBe(0);
    expect(result.compliance).toBe('FAIL');
  });
});

describe('OIML R 76-1:2006 Clause 3.9.1.1 & Clause A.5.1 - Tilting Test', () => {
  it('should pass tilting test when difference from level is within MPE', () => {
    // Class III, e = 1 kg, Load = 1000 kg (Zone 2 -> MPE = 1.0 kg)
    const result = calculateTilting({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      unit: 'kg',
      readings: [
        {
          tiltDirection: 'LEVEL',
          tiltValuePermil: 0,
          zeroIndication: 0,
          loadApplied: 1000,
          loadIndication: 1000,
          loadTurningPointDeltaL: 0.5, // Ec_level = 0
        },
        {
          tiltDirection: 'FRONT',
          tiltValuePermil: 50,
          zeroIndication: 0,
          loadApplied: 1000,
          loadIndication: 1000,
          loadTurningPointDeltaL: 0.2, // Ec_front = +0.3 -> Delta = 0.3 <= 1.0 kg (PASS)
        },
        {
          tiltDirection: 'BACK',
          tiltValuePermil: 50,
          zeroIndication: 0,
          loadApplied: 1000,
          loadIndication: 1000,
          loadTurningPointDeltaL: 0.8, // Ec_back = -0.3 -> Delta = 0.3 <= 1.0 kg (PASS)
        },
      ],
    });

    expect(result.maxDifferenceFromLevel).toBeCloseTo(0.3, 5);
    expect(result.overallCompliance).toBe('PASS');
  });

  it('should fail tilting test when difference from level exceeds MPE', () => {
    // MPE = 1.0 kg
    const result = calculateTilting({
      accuracyClass: 'CLASS_III',
      verificationScaleIntervalE: 1.0,
      unit: 'kg',
      readings: [
        {
          tiltDirection: 'LEVEL',
          tiltValuePermil: 0,
          zeroIndication: 0,
          loadApplied: 1000,
          loadIndication: 1000,
          loadTurningPointDeltaL: 0.5, // Ec_level = 0
        },
        {
          tiltDirection: 'FRONT',
          tiltValuePermil: 50,
          zeroIndication: 0,
          loadApplied: 1000,
          loadIndication: 1001,
          loadTurningPointDeltaL: 0.1, // Ec_front = 1001 + 0.5 - 0.1 - 1000 = +1.4 kg -> Delta = 1.4 kg > 1.0 kg
        },
      ],
    });

    expect(result.maxDifferenceFromLevel).toBeCloseTo(1.4, 5);
    expect(result.overallCompliance).toBe('FAIL');
  });
});
