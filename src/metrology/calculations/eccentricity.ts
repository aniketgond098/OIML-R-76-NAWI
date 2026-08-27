import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';
import { getMPEInE } from './weighing';

export interface EccentricityPositionCalculationInput {
  positionId: number;
  positionName: string;
  nominalLoadL: number;
  indicatedValueI: number;
  turningPointDeltaL?: number;
  zeroErrorE0?: number;
  verificationScaleIntervalE: number;
  unit: MassUnit;
  accuracyClass: AccuracyClass;
  isServiceVerification?: boolean;
}

export interface EccentricityPositionCalculationOutput {
  positionId: number;
  positionName: string;
  calculatedIndicationP: number;
  errorPriorToRoundingE: number;
  correctedErrorEc: number;
  mpeE: number;
  mpeInUnit: number;
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Determine recommended test load for eccentric loading based on OIML R 76-1:2006 Clause 3.6.2:
 * - Instruments with N <= 4 points of support: L = Max / 3
 * - Instruments with N > 4 points of support: L = Max / (N - 1)
 */
export function getRecommendedEccentricityLoad(
  maxCapacity: number,
  numberOfSupportPoints = 4,
  loadReceptorOrTare?: string | number,
  tareIfReceptorGiven = 0
): { recommendedLoad: number; formulaUsed: string; clauseRef: string } {
  let loadReceptorType: string | undefined;
  let additiveTare = 0;

  if (typeof loadReceptorOrTare === 'number') {
    additiveTare = loadReceptorOrTare;
  } else if (typeof loadReceptorOrTare === 'string') {
    loadReceptorType = loadReceptorOrTare;
    additiveTare = tareIfReceptorGiven;
  }

  const dMax = new Decimal(maxCapacity);
  const dTare = new Decimal(additiveTare);

  if (loadReceptorType === 'Weighbridge Deck' || loadReceptorType === 'Rolling Load') {
    // 0.8 Max for rolling load instruments (Clause 3.6.2.4)
    const load = dMax.times(0.8);
    return {
      recommendedLoad: load.toNumber(),
      formulaUsed: '0.8·Max',
      clauseRef: 'OIML R 76-1:2006, Clause 3.6.2.4 (Rolling loads / Weighbridge deck)',
    };
  }

  if (numberOfSupportPoints <= 4) {
    // 1/3 Max + Additive Tare (Clause 3.6.2.1)
    const load = dMax.dividedBy(3).plus(dTare);
    return {
      recommendedLoad: load.toNumber(),
      formulaUsed: additiveTare > 0 ? '(1/3)·Max + AdditiveTare' : '(1/3)·Max',
      clauseRef: 'OIML R 76-1:2006, Clause 3.6.2.1 (N <= 4 points of support)',
    };
  } else {
    // 1 / (N - 1) Max (Clause 3.6.2.2)
    const load = dMax.dividedBy(numberOfSupportPoints - 1);
    return {
      recommendedLoad: load.toNumber(),
      formulaUsed: `(1 / (${numberOfSupportPoints} - 1))·Max`,
      clauseRef: 'OIML R 76-1:2006, Clause 3.6.2.2 (N > 4 points of support)',
    };
  }
}

/**
 * Calculate error at a specific eccentric loading position
 * Clause 3.6.2 & A.4.7
 */
export function calculateEccentricityPosition(
  input: EccentricityPositionCalculationInput
): EccentricityPositionCalculationOutput {
  const {
    positionId,
    positionName,
    nominalLoadL,
    indicatedValueI,
    turningPointDeltaL,
    zeroErrorE0 = 0,
    verificationScaleIntervalE,
    unit,
    accuracyClass,
    isServiceVerification = false,
  } = input;

  const steps: CalculationTraceStep[] = [];
  const dL = new Decimal(nominalLoadL);
  const dI = new Decimal(indicatedValueI);
  const de = new Decimal(verificationScaleIntervalE);
  const dE0 = new Decimal(zeroErrorE0);

  let dP: Decimal;
  let dE: Decimal;
  let dEc: Decimal;

  if (turningPointDeltaL !== undefined && !isNaN(turningPointDeltaL)) {
    const dDeltaL = new Decimal(turningPointDeltaL);
    dP = dI.plus(de.times(0.5)).minus(dDeltaL);
    dE = dP.minus(dL);
    dEc = dE.minus(dE0);

    steps.push({
      stepName: `Turning Point Calculation at Position ${positionId} (${positionName})`,
      formula: 'P = I + 0.5·e - ΔL, Ec = (P - L) - E0',
      substitution: `P = ${formatDecimal(dI)} + 0.5·${formatDecimal(de)} - ${formatDecimal(dDeltaL)}, Ec = (${formatDecimal(dP, 4)} - ${formatDecimal(dL)}) - ${formatDecimal(dE0)}`,
      result: `Ec = ${formatDecimal(dEc, 4)} ${unit}`,
      unit,
      notes: 'OIML R 76-1:2006 Clause A.4.7',
    });
  } else {
    dE = dI.minus(dL);
    dP = dI;
    dEc = dE.minus(dE0);

    steps.push({
      stepName: `Direct Indication Error at Position ${positionId} (${positionName})`,
      formula: 'Ec = (I - L) - E0',
      substitution: `Ec = (${formatDecimal(dI)} - ${formatDecimal(dL)}) - ${formatDecimal(dE0)}`,
      result: `Ec = ${formatDecimal(dEc, 4)} ${unit}`,
      unit,
      notes: 'Direct reading without turning point weights',
    });
  }

  // Determine MPE for nominal load
  const mInE = dL.dividedBy(de);
  const { mpeE, clauseRef } = getMPEInE(accuracyClass, mInE, isServiceVerification);
  const dMpeInUnit = new Decimal(mpeE).times(de);

  steps.push({
    stepName: 'Permissible Tolerance for Eccentricity',
    formula: '|Ec| <= |MPE(L)|',
    substitution: `|${formatDecimal(dEc, 4)}| <= ${formatDecimal(dMpeInUnit, 4)} (±${mpeE} e)`,
    result: `MPE = ±${formatDecimal(dMpeInUnit, 4)} ${unit}`,
    unit,
    notes: `${clauseRef} (Clause 3.6.2)`,
  });

  const compliance: ComplianceStatus = dEc.abs().lessThanOrEqualTo(dMpeInUnit.plus(1e-9)) ? 'PASS' : 'FAIL';

  steps.push({
    stepName: 'Position Compliance Evaluation',
    formula: '|Ec| <= |MPE|',
    substitution: `${formatDecimal(dEc.abs(), 4)} <= ${formatDecimal(dMpeInUnit, 4)}`,
    result: compliance,
    notes: compliance === 'PASS' ? 'Within permissible eccentricity limit' : 'EXCEEDS MPE FOR ECCENTRICITY',
  });

  const explanation: CalculationExplanation = {
    testType: 'Eccentric Loading Test',
    ruleId: 'R76-2006-362-ECCENTRICITY',
    clauseRef: 'OIML R 76-1:2006, Clause 3.6.2 & Clause A.4.7',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Position': `${positionId} - ${positionName}`,
      'Test Load (L)': `${nominalLoadL} ${unit}`,
      'Indication (I)': `${indicatedValueI} ${unit}`,
      'Scale Interval (e)': `${verificationScaleIntervalE} ${unit}`,
      'Zero Error (E0)': `${zeroErrorE0} ${unit}`,
    },
    steps,
    finalResult: `Ec = ${formatDecimal(dEc, 4)} ${unit}`,
    limitRequirement: `|MPE| = ±${formatDecimal(dMpeInUnit, 4)} ${unit} (±${mpeE} e)`,
    compliance,
  };

  return {
    positionId,
    positionName,
    calculatedIndicationP: dP.toNumber(),
    errorPriorToRoundingE: dE.toNumber(),
    correctedErrorEc: dEc.toNumber(),
    mpeE,
    mpeInUnit: dMpeInUnit.toNumber(),
    compliance,
    explanation,
  };
}
