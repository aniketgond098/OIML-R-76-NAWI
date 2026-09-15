import { describe, it, expect } from 'vitest';
import {
  getRecommendedEccentricityLoad,
  calculateEccentricityPosition,
} from '../src/metrology/calculations/eccentricity';
import { evaluateOverallTestSessionCompliance } from '../src/metrology/compliance/complianceEngine';

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

  describe('Eccentricity Session & Compliance Engine Integration (OIML R 76-1:2006 Clause 3.6.2)', () => {
    const mockInstrument: any = {
      id: 'INST-001',
      serialNumber: 'SN-12345',
      model: 'PX-200',
      manufacturer: 'Mettler',
      accuracyClass: 'CLASS_III',
      maxCapacity: 150,
      minCapacity: 1,
      verificationScaleInterval: 0.05,
      actualScaleInterval: 0.05,
      unit: 'kg',
      numberOfSupportPoints: 4,
      loadReceptorType: 'Rectangular Platform',
    };

    it('must NEVER mark eccentricity as PASS when two incorrect/wrong values exceed MPE', () => {
      // 5 positions tested, 2 positions have wrong/incorrect readings exceeding MPE limit
      const eccentricityObservations: any[] = [
        {
          id: 'ecc-1',
          positionId: 1,
          positionName: 'Center',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.0,
          mpeInUnit: 0.05,
          compliance: 'PASS',
        },
        {
          id: 'ecc-2',
          positionId: 2,
          positionName: 'Front-Left',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: -0.01,
          mpeInUnit: 0.05,
          compliance: 'PASS',
        },
        {
          id: 'ecc-3',
          positionId: 3,
          positionName: 'Front-Right',
          nominalLoad: 50,
          indicatedValue: 50.15, // WRONG / INCORRECT VALUE
          correctedErrorEc: 0.15, // Exceeds MPE of 0.05
          mpeInUnit: 0.05,
          compliance: 'FAIL',
        },
        {
          id: 'ecc-4',
          positionId: 4,
          positionName: 'Rear-Left',
          nominalLoad: 50,
          indicatedValue: 50.2, // WRONG / INCORRECT VALUE
          correctedErrorEc: 0.2, // Exceeds MPE of 0.05
          mpeInUnit: 0.05,
          compliance: 'FAIL',
        },
        {
          id: 'ecc-5',
          positionId: 5,
          positionName: 'Rear-Right',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.02,
          mpeInUnit: 0.05,
          compliance: 'PASS',
        },
      ];

      const session: any = {
        id: 'SESSION-001',
        testSessionNumber: 'TS-2026-001',
        instrumentId: 'INST-001',
        instrumentSnapshot: mockInstrument,
        verificationType: 'INITIAL',
        status: 'IN_PROGRESS',
        testPlan: [
          {
            category: 'ECCENTRICITY',
            name: 'Eccentricity / Off-Centre Load Test',
            clauseRef: 'OIML R 76-1:2006, Clause 3.6.2',
            isApplicable: true,
            isMandatory: true,
            status: 'IN_PROGRESS',
            compliance: 'NOT_EVALUATED',
          },
        ],
        eccentricityObservations,
      };

      const result = evaluateOverallTestSessionCompliance(session);

      expect(session.testPlan[0].compliance).toBe('FAIL');
      expect(result.overallCompliance).toBe('FAIL');
      expect(result.summary.failedCount).toBe(1);
    });

    it('must evaluate eccentricity as FAIL if error exceeds MPE even if observation compliance field was omitted or stale', () => {
      const eccentricityObservations: any[] = [
        {
          id: 'ecc-1',
          positionId: 1,
          positionName: 'Center',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.0,
          mpeInUnit: 0.05,
        },
        {
          id: 'ecc-2',
          positionId: 2,
          positionName: 'Front-Left',
          nominalLoad: 50,
          indicatedValue: 50.15, // WRONG VALUE: Error = +0.15 exceeds MPE 0.05
          correctedErrorEc: 0.15,
          mpeInUnit: 0.05,
        },
        {
          id: 'ecc-3',
          positionId: 3,
          positionName: 'Front-Right',
          nominalLoad: 50,
          indicatedValue: 50.2, // WRONG VALUE: Error = +0.20 exceeds MPE 0.05
          correctedErrorEc: 0.2,
          mpeInUnit: 0.05,
        },
        {
          id: 'ecc-4',
          positionId: 4,
          positionName: 'Rear-Left',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.01,
          mpeInUnit: 0.05,
        },
      ];

      const session: any = {
        id: 'SESSION-002',
        testSessionNumber: 'TS-2026-002',
        instrumentId: 'INST-001',
        instrumentSnapshot: mockInstrument,
        verificationType: 'INITIAL',
        status: 'IN_PROGRESS',
        testPlan: [
          {
            category: 'ECCENTRICITY',
            name: 'Eccentricity / Off-Centre Load Test',
            clauseRef: 'OIML R 76-1:2006, Clause 3.6.2',
            isApplicable: true,
            isMandatory: true,
            status: 'IN_PROGRESS',
            compliance: 'NOT_EVALUATED',
          },
        ],
        eccentricityObservations,
      };

      const result = evaluateOverallTestSessionCompliance(session);

      expect(session.testPlan[0].compliance).toBe('FAIL');
      expect(result.overallCompliance).toBe('FAIL');
    });

    it('must NOT evaluate eccentricity as PASS when only 2 positions are recorded for a 4-point platform (incomplete test)', () => {
      // Only 2 positions entered out of required 4-5
      const eccentricityObservations: any[] = [
        {
          id: 'ecc-1',
          positionId: 1,
          positionName: 'Center',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.0,
          mpeInUnit: 0.05,
          compliance: 'PASS',
        },
        {
          id: 'ecc-2',
          positionId: 2,
          positionName: 'Front-Left',
          nominalLoad: 50,
          indicatedValue: 50.0,
          correctedErrorEc: 0.01,
          mpeInUnit: 0.05,
          compliance: 'PASS',
        },
      ];

      const session: any = {
        id: 'SESSION-003',
        testSessionNumber: 'TS-2026-003',
        instrumentId: 'INST-001',
        instrumentSnapshot: mockInstrument,
        verificationType: 'INITIAL',
        status: 'IN_PROGRESS',
        testPlan: [
          {
            category: 'ECCENTRICITY',
            name: 'Eccentricity / Off-Centre Load Test',
            clauseRef: 'OIML R 76-1:2006, Clause 3.6.2',
            isApplicable: true,
            isMandatory: true,
            status: 'IN_PROGRESS',
            compliance: 'NOT_EVALUATED',
          },
        ],
        eccentricityObservations,
      };

      const result = evaluateOverallTestSessionCompliance(session);

      // Must be NOT_EVALUATED / IN_PROGRESS, definitely NOT PASS!
      expect(session.testPlan[0].compliance).toBe('NOT_EVALUATED');
      expect(session.testPlan[0].status).toBe('IN_PROGRESS');
      expect(result.overallCompliance).toBe('NOT_EVALUATED');
    });
  });
});
