import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';
import { calculateWeighingError } from './weighing';

export interface TiltPositionReading {
  tiltDirection: 'LEVEL' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT';
  tiltValuePermil: number; // e.g. 50 (for 50/1000) or 0 for LEVEL
  zeroIndication: number;
  zeroTurningPointDeltaL?: number;
  loadApplied: number;
  loadIndication: number;
  loadTurningPointDeltaL?: number;
}

export interface TiltingCalculationInput {
  accuracyClass: AccuracyClass;
  verificationScaleIntervalE: number;
  unit: MassUnit;
  readings: TiltPositionReading[];
}

export interface TiltPositionEvaluation {
  tiltDirection: string;
  tiltValuePermil: number;
  zeroErrorE0: number;
  correctedErrorEc: number;
  differenceFromLevelEc: number;
  mpeInUnit: number;
  compliance: ComplianceStatus;
}

export interface TiltingCalculationOutput {
  positions: TiltPositionEvaluation[];
  maxDifferenceFromLevel: number;
  overallCompliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Tilting Test Calculation
 * OIML R 76-1:2006 Clause 3.9.1.1 & Clause A.5.1
 * When tilted to limiting angle (50/1000):
 * Difference between indication at tilted vs level position must not exceed MPE(L).
 */
export function calculateTilting(input: TiltingCalculationInput): TiltingCalculationOutput {
  const { accuracyClass, verificationScaleIntervalE, unit, readings } = input;
  const steps: CalculationTraceStep[] = [];
  const de = new Decimal(verificationScaleIntervalE);

  const levelReading = readings.find((r) => r.tiltDirection === 'LEVEL') || readings[0];

  if (!levelReading) {
    return {
      positions: [],
      maxDifferenceFromLevel: 0,
      overallCompliance: 'NOT_EVALUATED',
      explanation: {
        testType: 'Tilting Test',
        ruleId: 'R76-2006-3911-TILTING',
        clauseRef: 'OIML R 76-1:2006, Clause 3.9.1.1 & Clause A.5.1',
        standard: 'OIML R 76-1:2006',
        inputs: {},
        steps: [],
        finalResult: 'NOT_EVALUATED',
        limitRequirement: '|Delta E| <= MPE(L)',
        compliance: 'NOT_EVALUATED',
        notes: 'Level baseline reading is required.',
      },
    };
  }

  // Calculate level reference error
  const levelEval = calculateWeighingError({
    accuracyClass,
    verificationScaleIntervalE,
    nominalLoadL: levelReading.loadApplied,
    indicatedValueI: levelReading.loadIndication,
    turningPointDeltaL: levelReading.loadTurningPointDeltaL,
    zeroErrorE0: 0,
    unit,
  });

  const levelEc = new Decimal(levelEval.correctedErrorEc);

  steps.push({
    stepName: 'Baseline (Level Position) Evaluation',
    formula: 'Ec_level = I + 0.5·e - ΔL - L',
    substitution: `Load: ${levelReading.loadApplied} ${unit}, Ec = ${formatDecimal(levelEc, 5)} ${unit}`,
    result: `${formatDecimal(levelEc, 5)} ${unit}`,
    unit,
    notes: 'Reference error at 0/1000 level position (Clause A.5.1)',
  });

  let maxDiff = new Decimal(0);
  let allPass = true;
  const evaluations: TiltPositionEvaluation[] = [];

  for (const r of readings) {
    const posEval = calculateWeighingError({
      accuracyClass,
      verificationScaleIntervalE,
      nominalLoadL: r.loadApplied,
      indicatedValueI: r.loadIndication,
      turningPointDeltaL: r.loadTurningPointDeltaL,
      zeroErrorE0: 0,
      unit,
    });

    const posEc = new Decimal(posEval.correctedErrorEc);
    const diffFromLevel = posEc.minus(levelEc).abs();

    if (diffFromLevel.greaterThan(maxDiff)) {
      maxDiff = diffFromLevel;
    }

    const dMpe = new Decimal(posEval.mpeInUnit);
    const isPass = diffFromLevel.lessThanOrEqualTo(dMpe.plus(1e-9));

    if (!isPass) {
      allPass = false;
    }

    evaluations.push({
      tiltDirection: r.tiltDirection,
      tiltValuePermil: r.tiltValuePermil,
      zeroErrorE0: r.zeroIndication,
      correctedErrorEc: posEc.toNumber(),
      differenceFromLevelEc: diffFromLevel.toNumber(),
      mpeInUnit: dMpe.toNumber(),
      compliance: isPass ? 'PASS' : 'FAIL',
    });

    if (r.tiltDirection !== 'LEVEL') {
      steps.push({
        stepName: `Tilt Position: ${r.tiltDirection} (${r.tiltValuePermil}‰)`,
        formula: 'ΔE_tilt = |Ec_tilted - Ec_level| <= MPE',
        substitution: `|${formatDecimal(posEc, 4)} - ${formatDecimal(levelEc, 4)}| = ${formatDecimal(diffFromLevel, 4)} ${unit} vs MPE ±${formatDecimal(dMpe, 4)} ${unit}`,
        result: isPass ? 'PASS' : 'FAIL',
        unit,
        notes: `OIML R 76-1:2006 Clause 3.9.1.1 requirement`,
      });
    }
  }

  const overallCompliance: ComplianceStatus = allPass ? 'PASS' : 'FAIL';

  const explanation: CalculationExplanation = {
    testType: 'Tilting Test (50/1000)',
    ruleId: 'R76-2006-3911-TILTING',
    clauseRef: 'OIML R 76-1:2006, Clause 3.9.1.1 & Clause A.5.1',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Accuracy Class': accuracyClass,
      'Scale Interval (e)': `${verificationScaleIntervalE} ${unit}`,
      'Level Load': `${levelReading.loadApplied} ${unit}`,
      'Positions Tested': `${readings.length}`,
    },
    steps,
    finalResult: `Max Difference = ${formatDecimal(maxDiff, 5)} ${unit}`,
    limitRequirement: `|ΔE| <= MPE`,
    compliance: overallCompliance,
  };

  return {
    positions: evaluations,
    maxDifferenceFromLevel: maxDiff.toNumber(),
    overallCompliance,
    explanation,
  };
}
