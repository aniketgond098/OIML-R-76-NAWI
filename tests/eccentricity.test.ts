import { describe, it, expect } from 'vitest';
import {
  getRecommendedEccentricityLoad,
  calculateEccentricityPosition,
} from '../src/metrology/calculations/eccentricity';

describe('OIML R 76-1:2006 Clause 3.6.2 & Clause A.4.7 - Eccentricity Testing', () => {
  describe('Test Load Selection Rules', () => {
    it('should calculate Max / 3 for platforms with <= 4 support points (Clause 3.6.2.1)', () => {
      // Max = 150 kg, 4 support points -> Load = 50 kg
      const load = getRecommendedEccentricityLoad(150, 4, 'Rectangular Platform');
      expect(load.recommendedLoad).toBe(50);
    });

    it('should include additive tare in Max/3 + Tadd (Clause 3.6.2.1)', () => {
      const load = getRecommendedEccentricityLoad(150, 4, 'Rectangular Platform', 30);
      expect(load.recommendedLoad).toBe(80);
    });

    it('should calculate Max / (N - 1) for platforms with > 4 points (Clause 3.6.2.2)', () => {
      // Max = 60,000 kg, 5 points -> Load = 60,000 / 4 = 15,000 kg
      const load = getRecommendedEccentricityLoad(60000, 5, 'Rectangular Platform');
      expect(load.recommendedLoad).toBe(15000);
    });

    it('should calculate 0.8 * Max for rolling loads / weighbridges (Clause 3.6.2.4)', () => {
      const load = getRecommendedEccentricityLoad(10000, 4, 'Weighbridge Deck');
      expect(load.recommendedLoad).toBe(8000);
    });
  });

  describe('Position Error and Threshold Compliance', () => {
    it('should pass position error within MPE', () => {
      // Load = 50 kg, e = 0.05 kg (1000 e -> MPE = 1.0 e = 0.05 kg)
      const result = calculateEccentricityPosition({
        positionId: 2,
        positionName: 'Front-Left',
        nominalLoadL: 50,
        indicatedValueI: 50.0,
        turningPointDeltaL: 0.03, // P = 50 + 0.025 - 0.03 = 49.995, E = -0.005
        zeroErrorE0: 0,
        verificationScaleIntervalE: 0.05,
        accuracyClass: 'CLASS_III',
        unit: 'kg',
      });

      expect(result.correctedErrorEc).toBeCloseTo(-0.005, 5);
      expect(result.mpeInUnit).toBeCloseTo(0.05, 5);
      expect(result.compliance).toBe('PASS');
    });

    it('should fail position error exceeding MPE', () => {
      // Load = 50 kg, e = 0.05 kg (MPE = 0.05 kg)
      // Indication = 50.1 kg, ΔL = 0.025 -> E = +0.1 kg > 0.05 kg
      const result = calculateEccentricityPosition({
        positionId: 3,
        positionName: 'Rear-Right',
        nominalLoadL: 50,
        indicatedValueI: 50.1,
        turningPointDeltaL: 0.025,
        zeroErrorE0: 0,
        verificationScaleIntervalE: 0.05,
        accuracyClass: 'CLASS_III',
        unit: 'kg',
      });

      expect(result.correctedErrorEc).toBeCloseTo(0.1, 5);
      expect(result.mpeInUnit).toBeCloseTo(0.05, 5);
      expect(result.compliance).toBe('FAIL');
    });
  });
});
