import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';
import { getMPEInE } from './weighing';

export interface RepeatabilityCalculationInput {
  nominalLoadL: number;
  readings: {
    runIndex: number;
    zeroIndication: number;
    indicatedValue: number;
    turningPointDeltaL?: number;
  }[];
  verificationScaleIntervalE: number;
  unit: MassUnit;
  accuracyClass: AccuracyClass;
  isServiceVerification?: boolean;
}

export interface RepeatabilityCalculationOutput {
  maxIndication: number;
  minIndication: number;
  deltaI: number; // I_max - I_min
  meanIndication: number;
  stdDeviation: number;
  mpeE: number;
  mpeInUnit: number;
  isSpanPass: boolean;
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Repeatability evaluation according to OIML R 76-1:2006 Clause 3.6.1 & A.4.10
 * Requirement: ΔI = I_max - I_min shall not exceed |MPE(L)|
 */
export function calculateRepeatability(input: RepeatabilityCalculationInput): RepeatabilityCalculationOutput {
  const {
    nominalLoadL,
    readings,
    verificationScaleIntervalE,
    unit,
    accuracyClass,
    isServiceVerification = false,
  } = input;

  const steps: CalculationTraceStep[] = [];
  const de = new Decimal(verificationScaleIntervalE);
  const dL = new Decimal(nominalLoadL);

  if (!readings || readings.length === 0) {
    return {
      maxIndication: 0,
      minIndication: 0,
      deltaI: 0,
      meanIndication: 0,
      stdDeviation: 0,
      mpeE: 0,
      mpeInUnit: 0,
      isSpanPass: false,
      compliance: 'NOT_EVALUATED',
      explanation: {
        testType: 'Repeatability Test',
        ruleId: 'R76-2006-361-REPEATABILITY',
        clauseRef: 'OIML R 76-1:2006, Clause 3.6.1',
        standard: 'OIML R 76-1:2006',
        inputs: {},
        steps: [],
        finalResult: 'No readings provided',
        limitRequirement: 'ΔI <= |MPE|',
        compliance: 'NOT_EVALUATED',
      },
    };
  }

  // Extract indications
  const indications = readings.map((r) => new Decimal(r.indicatedValue));
  let maxD = indications[0];
  let minD = indications[0];
  let sumD = new Decimal(0);

  for (const val of indications) {
    if (val.greaterThan(maxD)) maxD = val;
    if (val.lessThan(minD)) minD = val;
    sumD = sumD.plus(val);
  }

  const deltaI = maxD.minus(minD);
  const meanD = sumD.dividedBy(indications.length);

  // Calculate sample standard deviation
  let sumSqDiff = new Decimal(0);
  for (const val of indications) {
    const diff = val.minus(meanD);
    sumSqDiff = sumSqDiff.plus(diff.times(diff));
  }
  const stdDev = indications.length > 1
    ? sumSqDiff.dividedBy(indications.length - 1).sqrt()
    : new Decimal(0);

  steps.push({
    stepName: 'Max and Min Indications',
    formula: 'I_max, I_min from observation series',
    substitution: `I_max = ${formatDecimal(maxD, 4)} ${unit}, I_min = ${formatDecimal(minD, 4)} ${unit}`,
    result: `Span ΔI = ${formatDecimal(deltaI, 4)} ${unit}`,
    unit,
    notes: `Calculated from ${readings.length} sequential weighing cycles`,
  });

  // Determine MPE for nominal load
  const mInE = dL.dividedBy(de);
  const { mpeE, clauseRef } = getMPEInE(accuracyClass, mInE, isServiceVerification);
  const dMpeInUnit = new Decimal(mpeE).times(de);

  steps.push({
    stepName: 'Applicable Repeatability Limit (MPE)',
    formula: '|MPE(L)| = mpe_E · e',
    substitution: `${mpeE} · ${formatDecimal(de)} ${unit}`,
    result: `${formatDecimal(dMpeInUnit, 4)} ${unit} (${mpeE} e)`,
    unit,
    notes: `${clauseRef} (Requirement: I_max - I_min <= |MPE(L)|)`,
  });

  // Evaluate Compliance
  let compliance: ComplianceStatus = 'NOT_EVALUATED';
  if (readings.length >= 3) {
    if (deltaI.lessThanOrEqualTo(dMpeInUnit.plus(1e-9))) {
      compliance = 'PASS';
    } else {
      compliance = 'FAIL';
    }
  } else {
    compliance = 'NOT_EVALUATED';
  }

  steps.push({
    stepName: 'Repeatability Compliance Decision',
    formula: 'ΔI <= |MPE(L)|',
    substitution: `${formatDecimal(deltaI, 4)} <= ${formatDecimal(dMpeInUnit, 4)}`,
    result: compliance,
    notes: compliance === 'PASS' ? 'Repeatability is within OIML R-76 limit' : 'Repeatability span exceeds MPE',
  });

  const explanation: CalculationExplanation = {
    testType: 'Repeatability Test',
    ruleId: 'R76-2006-361-REPEATABILITY',
    clauseRef: 'OIML R 76-1:2006, Clause 3.6.1 & Clause A.4.10',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Nominal Load (L)': `${nominalLoadL} ${unit}`,
      'Number of Runs': readings.length,
      'Max Indication (I_max)': `${formatDecimal(maxD, 4)} ${unit}`,
      'Min Indication (I_min)': `${formatDecimal(minD, 4)} ${unit}`,
      'Verification Interval (e)': `${verificationScaleIntervalE} ${unit}`,
    },
    steps,
    finalResult: `ΔI = ${formatDecimal(deltaI, 4)} ${unit} (Mean: ${formatDecimal(meanD, 4)}, s: ${formatDecimal(stdDev, 4)})`,
    limitRequirement: `|MPE| = ${formatDecimal(dMpeInUnit, 4)} ${unit} (±${mpeE} e)`,
    compliance,
  };

  return {
    maxIndication: maxD.toNumber(),
    minIndication: minD.toNumber(),
    deltaI: deltaI.toNumber(),
    meanIndication: meanD.toNumber(),
    stdDeviation: stdDev.toNumber(),
    mpeE,
    mpeInUnit: dMpeInUnit.toNumber(),
    isSpanPass: compliance === 'PASS',
    compliance,
    explanation,
  };
}
