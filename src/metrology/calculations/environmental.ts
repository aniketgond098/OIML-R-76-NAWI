import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';

export interface TemperatureSpanCalculationInput {
  temperatures: {
    tempC: number;
    zeroErrorE0: number;
    spanLoad: number;
    spanIndication: number;
    spanErrorE: number;
  }[];
  verificationScaleIntervalE: number;
  unit: MassUnit;
  accuracyClass: AccuracyClass;
}

export interface TemperatureSpanCalculationOutput {
  temperatureDifferenceDeltaT: number;
  spanShiftPer5C: number;
  maxPermissibleShiftPer5C: number;
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Temperature Influence on Span Stability (Static Temperature Test)
 * OIML R 76-1:2006 Clause 3.9.2.3 & Clause A.5.3
 * Effect of temperature difference: span error difference per 5°C shall not exceed 1 e (Class II, III, IIII).
 */
export function calculateTemperatureSpan(input: TemperatureSpanCalculationInput): TemperatureSpanCalculationOutput {
  const { temperatures, verificationScaleIntervalE, unit, accuracyClass } = input;
  const steps: CalculationTraceStep[] = [];
  const de = new Decimal(verificationScaleIntervalE);

  if (temperatures.length < 2) {
    return {
      temperatureDifferenceDeltaT: 0,
      spanShiftPer5C: 0,
      maxPermissibleShiftPer5C: de.toNumber(),
      compliance: 'NOT_EVALUATED',
      explanation: {
        testType: 'Temperature Span Stability Test',
        ruleId: 'R76-2006-3923-TEMP-SPAN',
        clauseRef: 'OIML R 76-1:2006, Clause 3.9.2.3',
        standard: 'OIML R 76-1:2006',
        inputs: {},
        steps: [],
        finalResult: 'At least 2 distinct temperature points required (e.g. 20°C and 40°C or -10°C)',
        limitRequirement: '<= 1.0 e / 5°C',
        compliance: 'NOT_EVALUATED',
      },
    };
  }

  const t1 = temperatures[0];
  const t2 = temperatures[temperatures.length - 1];

  const dDeltaT = new Decimal(t2.tempC).minus(t1.tempC).abs();
  const dSpanErrDiff = new Decimal(t2.spanErrorE).minus(t1.spanErrorE).abs();

  // Shift per 5°C = (ΔE / ΔT) * 5
  const dShiftPer5C = dDeltaT.isZero() ? new Decimal(0) : dSpanErrDiff.dividedBy(dDeltaT).times(5);
  const dMaxAllowedShift = de.times(1.0); // 1.0 e per 5°C

  steps.push({
    stepName: 'Temperature Interval ΔT',
    formula: 'ΔT = |T2 - T1|',
    substitution: `|${t2.tempC}°C - ${t1.tempC}°C|`,
    result: `${formatDecimal(dDeltaT, 1)} °C`,
    notes: 'Static chamber test span',
  });

  steps.push({
    stepName: 'Span Drift per 5°C',
    formula: 'Shift = (|E(T2) - E(T1)| / ΔT) · 5',
    substitution: `(${formatDecimal(dSpanErrDiff, 4)} / ${formatDecimal(dDeltaT, 1)}) · 5`,
    result: `${formatDecimal(dShiftPer5C, 4)} ${unit}`,
    unit,
    notes: 'OIML R 76-1:2006 Clause 3.9.2.3',
  });

  const compliance: ComplianceStatus = dShiftPer5C.lessThanOrEqualTo(dMaxAllowedShift.plus(1e-9)) ? 'PASS' : 'FAIL';

  steps.push({
    stepName: 'Temperature Span Compliance',
    formula: 'Shift <= 1.0·e per 5°C',
    substitution: `${formatDecimal(dShiftPer5C, 4)} <= ${formatDecimal(dMaxAllowedShift, 4)} (1.0 e)`,
    result: compliance,
    notes: compliance === 'PASS' ? 'Span stability is satisfied' : 'EXCEEDS TEMPERATURE SPAN DRIFT LIMIT',
  });

  const explanation: CalculationExplanation = {
    testType: 'Temperature Span Stability Test',
    ruleId: 'R76-2006-3923-TEMP-SPAN',
    clauseRef: 'OIML R 76-1:2006, Clause 3.9.2.3 & Clause A.5.3',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'T1': `${t1.tempC} °C, Error: ${t1.spanErrorE} ${unit}`,
      'T2': `${t2.tempC} °C, Error: ${t2.spanErrorE} ${unit}`,
      'ΔT': `${dDeltaT} °C`,
    },
    steps,
    finalResult: `Shift per 5°C = ${formatDecimal(dShiftPer5C, 4)} ${unit}`,
    limitRequirement: `Max 1.0 e / 5°C = ${formatDecimal(dMaxAllowedShift, 4)} ${unit}`,
    compliance,
  };

  return {
    temperatureDifferenceDeltaT: dDeltaT.toNumber(),
    spanShiftPer5C: dShiftPer5C.toNumber(),
    maxPermissibleShiftPer5C: dMaxAllowedShift.toNumber(),
    compliance,
    explanation,
  };
}
