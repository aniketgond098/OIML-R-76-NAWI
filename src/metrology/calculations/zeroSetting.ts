import { ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';

export interface ZeroSettingCalculationInput {
  zeroIndicationI0: number;
  turningPointDeltaL0: number;
  verificationScaleIntervalE: number;
  unit: MassUnit;
  testType?: 'NON_AUTOMATIC' | 'SEMI_AUTOMATIC' | 'INITIAL_ZERO_SETTING';
  maxCapacity?: number;
  maxZeroRangeLoadApplied?: number;
}

export interface ZeroSettingCalculationOutput {
  calculatedZeroErrorE0: number;
  maxPermissibleZeroError: number; // 0.25 e
  isZeroAccuracyPass: boolean;
  zeroRangePercentMax?: number;
  isZeroRangePass?: boolean;
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Zero-Setting and Zero-Tracking Calculation
 * OIML R 76-1:2006 Clause 4.5.2 & Clause A.4.2.3
 * E0 = I0 + 0.5e - ΔL0
 * Permissible tolerance: |E0| <= 0.25 e
 */
export function calculateZeroSetting(input: ZeroSettingCalculationInput): ZeroSettingCalculationOutput {
  const {
    zeroIndicationI0,
    turningPointDeltaL0,
    verificationScaleIntervalE,
    unit,
    testType = 'NON_AUTOMATIC',
    maxCapacity,
    maxZeroRangeLoadApplied,
  } = input;

  const steps: CalculationTraceStep[] = [];
  const dI0 = new Decimal(zeroIndicationI0);
  const dDeltaL0 = new Decimal(turningPointDeltaL0);
  const de = new Decimal(verificationScaleIntervalE);

  // E0 = I0 + 0.5e - ΔL0
  const dE0 = dI0.plus(de.times(0.5)).minus(dDeltaL0);
  const dMaxPermissibleE0 = de.times(0.25);

  steps.push({
    stepName: 'Zero Error Calculation (E0)',
    formula: 'E0 = I0 + 0.5·e - ΔL0',
    substitution: `E0 = ${formatDecimal(dI0)} + 0.5·${formatDecimal(de)} - ${formatDecimal(dDeltaL0)}`,
    result: `E0 = ${formatDecimal(dE0, 5)} ${unit}`,
    unit,
    notes: 'OIML R 76-1:2006 Clause A.4.2.3',
  });

  steps.push({
    stepName: 'Maximum Permissible Zero-Setting Error',
    formula: '|E0| <= ±0.25·e',
    substitution: `0.25 · ${formatDecimal(de)} ${unit}`,
    result: `±${formatDecimal(dMaxPermissibleE0, 5)} ${unit} (±0.25 e)`,
    unit,
    notes: 'OIML R 76-1:2006 Clause 4.5.2',
  });

  const isZeroAccuracyPass = dE0.abs().lessThanOrEqualTo(dMaxPermissibleE0.plus(1e-9));

  let isZeroRangePass = true;
  let zeroRangePercentMax: number | undefined;

  if (maxCapacity && maxZeroRangeLoadApplied !== undefined) {
    const dMaxCap = new Decimal(maxCapacity);
    const dZeroLoad = new Decimal(maxZeroRangeLoadApplied);
    const percent = dZeroLoad.dividedBy(dMaxCap).times(100);
    zeroRangePercentMax = percent.toNumber();

    const allowedPercent = testType === 'INITIAL_ZERO_SETTING' ? 20.0 : 4.0;
    isZeroRangePass = percent.lessThanOrEqualTo(allowedPercent);

    steps.push({
      stepName: 'Zero-Setting Range Evaluation',
      formula: 'Range % = (MaxZeroableLoad / Max) · 100',
      substitution: `(${formatDecimal(dZeroLoad)} / ${formatDecimal(dMaxCap)}) · 100 = ${formatDecimal(percent, 2)}%`,
      result: isZeroRangePass ? 'PASS' : 'FAIL',
      unit: '%',
      notes: `Limit: <= ${allowedPercent}% of Max (Clause 4.5.1)`,
    });
  }

  const overallCompliance: ComplianceStatus = (isZeroAccuracyPass && isZeroRangePass) ? 'PASS' : 'FAIL';

  steps.push({
    stepName: 'Zero-Setting Overall Compliance',
    formula: '|E0| <= 0.25·e',
    substitution: `|${formatDecimal(dE0, 5)}| <= ${formatDecimal(dMaxPermissibleE0, 5)}`,
    result: overallCompliance,
    notes: overallCompliance === 'PASS' ? 'Zero-setting error within permissible limit' : 'ZERO ERROR EXCEEDS 0.25 e',
  });

  const explanation: CalculationExplanation = {
    testType: 'Zero-Setting & Tracking Test',
    ruleId: 'R76-2006-452-ZERO-ACCURACY',
    clauseRef: 'OIML R 76-1:2006, Clause 4.5.2 & Clause A.4.2.3',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Zero Indication (I0)': `${zeroIndicationI0} ${unit}`,
      'Fractional Weight (ΔL0)': `${turningPointDeltaL0} ${unit}`,
      'Scale Interval (e)': `${verificationScaleIntervalE} ${unit}`,
    },
    steps,
    finalResult: `Zero Error E0 = ${formatDecimal(dE0, 5)} ${unit}`,
    limitRequirement: `±0.25 e = ±${formatDecimal(dMaxPermissibleE0, 5)} ${unit}`,
    compliance: overallCompliance,
  };

  return {
    calculatedZeroErrorE0: dE0.toNumber(),
    maxPermissibleZeroError: dMaxPermissibleE0.toNumber(),
    isZeroAccuracyPass,
    zeroRangePercentMax,
    isZeroRangePass,
    compliance: overallCompliance,
    explanation,
  };
}
