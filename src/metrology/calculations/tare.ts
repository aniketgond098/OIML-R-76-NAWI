import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';
import { calculateWeighingError } from './weighing';

export interface TareCalculationInput {
  tareLoadAppliedT?: number;
  tareLoadApplied?: number;
  indicatedTareI?: number;
  indicatedTare?: number;
  turningPointDeltaLTare: number;
  verificationScaleIntervalE: number;
  unit: MassUnit;
  accuracyClass: AccuracyClass;
  netTestPoints: {
    nominalNetLoad: number;
    indicatedNet: number;
    turningPointDeltaL?: number;
  }[];
}

export interface TareCalculationOutput {
  calculatedTareErrorEtare: number;
  calculatedTareError: number; // alias for calculatedTareErrorEtare
  maxPermissibleTareError: number; // 0.25 e
  isTareAccuracyPass: boolean;
  evaluatedNetPoints: {
    nominalNetLoad: number;
    indicatedNet: number;
    correctedNetErrorEc: number;
    mpeInUnit: number;
    compliance: ComplianceStatus;
  }[];
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Tare Test Calculation
 * OIML R 76-1:2006 Clause 4.6.3 & Clause A.4.6
 * 1. Accuracy of Tare setting: |Etare| <= 0.25 e
 * 2. Net weighing accuracy: MPE applied to Net load.
 */
export function calculateTare(input: TareCalculationInput): TareCalculationOutput {
  const tareLoad = input.tareLoadAppliedT ?? input.tareLoadApplied ?? 0;
  const indTare = input.indicatedTareI ?? input.indicatedTare ?? 0;
  const {
    turningPointDeltaLTare,
    verificationScaleIntervalE,
    unit,
    accuracyClass,
    netTestPoints,
  } = input;

  const steps: CalculationTraceStep[] = [];
  const de = new Decimal(verificationScaleIntervalE);
  const dTareLoad = new Decimal(tareLoad);
  const dIndTare = new Decimal(indTare);
  const dDeltaLTare = new Decimal(turningPointDeltaLTare);

  // Etare = (I_tare + 0.5e - ΔL_tare) - T
  const dPTare = dIndTare.plus(de.times(0.5)).minus(dDeltaLTare);
  const dETare = dPTare.minus(dTareLoad);
  const dMaxTareError = de.times(0.25);

  steps.push({
    stepName: 'Tare Setting Error (Etare)',
    formula: 'Etare = (Itare + 0.5·e - ΔLtare) - T',
    substitution: `Etare = (${formatDecimal(dIndTare)} + 0.5·${formatDecimal(de)} - ${formatDecimal(dDeltaLTare)}) - ${formatDecimal(dTareLoad)}`,
    result: `Etare = ${formatDecimal(dETare, 5)} ${unit}`,
    unit,
    notes: 'OIML R 76-1:2006 Clause A.4.6.1',
  });

  const isTareAccuracyPass = dETare.abs().lessThanOrEqualTo(dMaxTareError.plus(1e-9));

  steps.push({
    stepName: 'Tare Setting Tolerance Check',
    formula: '|Etare| <= 0.25·e',
    substitution: `|${formatDecimal(dETare, 5)}| <= ${formatDecimal(dMaxTareError, 5)}`,
    result: isTareAccuracyPass ? 'PASS' : 'FAIL',
    unit,
    notes: 'Clause 4.6.3 (Tare accuracy requirement)',
  });

  let allNetPass = true;
  const evaluatedNetPoints = netTestPoints.map((pt) => {
    const netRes = calculateWeighingError({
      nominalLoadL: pt.nominalNetLoad,
      indicatedValueI: pt.indicatedNet,
      verificationScaleIntervalE,
      unit,
      accuracyClass,
      turningPointDeltaL: pt.turningPointDeltaL,
      zeroErrorE0: 0,
    });

    if (netRes.compliance !== 'PASS') {
      allNetPass = false;
    }

    return {
      nominalNetLoad: pt.nominalNetLoad,
      indicatedNet: pt.indicatedNet,
      correctedNetErrorEc: netRes.correctedErrorEc,
      mpeInUnit: netRes.mpeInUnit,
      compliance: netRes.compliance,
    };
  });

  const overallCompliance: ComplianceStatus = (isTareAccuracyPass && allNetPass) ? 'PASS' : 'FAIL';

  steps.push({
    stepName: 'Overall Tare Test Compliance',
    formula: 'Tare Setting PASS and all Net Load Points PASS',
    substitution: `Tare Setting: ${isTareAccuracyPass ? 'PASS' : 'FAIL'}, Net Points: ${allNetPass ? 'PASS' : 'FAIL'}`,
    result: overallCompliance,
    notes: 'Clause 4.6.3 & A.4.6',
  });

  const explanation: CalculationExplanation = {
    testType: 'Tare Test',
    ruleId: 'R76-2006-463-TARE-ACCURACY',
    clauseRef: 'OIML R 76-1:2006, Clause 4.6.3 & Clause A.4.6',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Applied Tare Load (T)': `${tareLoad} ${unit}`,
      'Indicated Tare': `${indTare} ${unit}`,
      'Net Points Count': netTestPoints.length,
    },
    steps,
    finalResult: `Tare Error = ${formatDecimal(dETare, 5)} ${unit}`,
    limitRequirement: `±0.25 e = ±${formatDecimal(dMaxTareError, 5)} ${unit}`,
    compliance: overallCompliance,
  };

  return {
    calculatedTareErrorEtare: dETare.toNumber(),
    calculatedTareError: dETare.toNumber(),
    maxPermissibleTareError: dMaxTareError.toNumber(),
    isTareAccuracyPass,
    evaluatedNetPoints,
    compliance: overallCompliance,
    explanation,
  };
}
