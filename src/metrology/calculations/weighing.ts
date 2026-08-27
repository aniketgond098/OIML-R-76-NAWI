import { AccuracyClass, ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, decimalCompare, formatDecimal, formatMass } from '../units/decimal';

/**
 * Get Maximum Permissible Error (MPE) in units of verification scale interval (e)
 * as defined in OIML R 76-1:2006, Clause 3.5.1, Table 6.
 *
 * @param accuracyClass Accuracy class (I, II, III, IIII)
 * @param loadInE Load m expressed in verification scale intervals (m = L / e)
 * @param isServiceVerification If true, MPE is doubled (Clause 3.5.2)
 */
export function getMPEInE(
  accuracyClass: AccuracyClass,
  loadInE: number | Decimal,
  isServiceVerification = false
): { mpeE: number; zoneIndex: number; clauseRef: string } {
  const m = new Decimal(loadInE).abs();
  let mpeE = 0.5;
  let zoneIndex = 1;

  switch (accuracyClass) {
    case 'CLASS_I':
      if (m.lessThanOrEqualTo(50000)) {
        mpeE = 0.5;
        zoneIndex = 1;
      } else if (m.lessThanOrEqualTo(200000)) {
        mpeE = 1.0;
        zoneIndex = 2;
      } else {
        mpeE = 1.5;
        zoneIndex = 3;
      }
      break;

    case 'CLASS_II':
      if (m.lessThanOrEqualTo(5000)) {
        mpeE = 0.5;
        zoneIndex = 1;
      } else if (m.lessThanOrEqualTo(20000)) {
        mpeE = 1.0;
        zoneIndex = 2;
      } else {
        mpeE = 1.5;
        zoneIndex = 3;
      }
      break;

    case 'CLASS_III':
      if (m.lessThanOrEqualTo(500)) {
        mpeE = 0.5;
        zoneIndex = 1;
      } else if (m.lessThanOrEqualTo(2000)) {
        mpeE = 1.0;
        zoneIndex = 2;
      } else {
        mpeE = 1.5;
        zoneIndex = 3;
      }
      break;

    case 'CLASS_IIII':
      if (m.lessThanOrEqualTo(50)) {
        mpeE = 0.5;
        zoneIndex = 1;
      } else if (m.lessThanOrEqualTo(200)) {
        mpeE = 1.0;
        zoneIndex = 2;
      } else {
        mpeE = 1.5;
        zoneIndex = 3;
      }
      break;
  }

  if (isServiceVerification) {
    mpeE *= 2;
  }

  return {
    mpeE,
    zoneIndex,
    clauseRef: 'OIML R 76-1:2006, Clause 3.5.1, Table 6',
  };
}

export interface WeighingCalculationInput {
  nominalLoadL: number;
  indicatedValueI: number;
  verificationScaleIntervalE: number;
  unit: MassUnit;
  accuracyClass: AccuracyClass;
  turningPointDeltaL?: number;
  zeroErrorE0?: number;
  isServiceVerification?: boolean;
}

export interface WeighingCalculationOutput {
  calculatedIndicationP: number;
  errorPriorToRoundingE: number;
  correctedErrorEc: number;
  mpeE: number;
  mpeInUnit: number;
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Pure calculation function for Turning Point / Flash Point Error calculation
 * Reference: OIML R 76-1:2006, Clause A.4.4.3 & Clause 3.5.3.2
 */
export function calculateWeighingError(input: WeighingCalculationInput): WeighingCalculationOutput {
  const {
    nominalLoadL,
    indicatedValueI,
    verificationScaleIntervalE,
    unit,
    accuracyClass,
    turningPointDeltaL,
    zeroErrorE0 = 0,
    isServiceVerification = false,
  } = input;

  const steps: CalculationTraceStep[] = [];

  const dL = new Decimal(nominalLoadL);
  const dI = new Decimal(indicatedValueI);
  const de = new Decimal(verificationScaleIntervalE);
  const dE0 = new Decimal(zeroErrorE0);

  // Check if deltaL is provided (turning point method)
  let dP: Decimal;
  let dE: Decimal;
  let dEc: Decimal;

  if (turningPointDeltaL !== undefined && !isNaN(turningPointDeltaL)) {
    const dDeltaL = new Decimal(turningPointDeltaL);
    
    // Step 1: Indication prior to rounding P = I + 0.5e - ΔL
    dP = dI.plus(de.times(0.5)).minus(dDeltaL);
    steps.push({
      stepName: 'Indication Prior to Rounding (P)',
      formula: 'P = I + 0.5·e - ΔL',
      substitution: `P = ${formatDecimal(dI)} + 0.5·${formatDecimal(de)} - ${formatDecimal(dDeltaL)}`,
      result: formatDecimal(dP, 5),
      unit,
      notes: 'OIML R 76-1:2006 Clause A.4.4.3 (Flash point turning method)',
    });

    // Step 2: Error prior to rounding E = P - L
    dE = dP.minus(dL);
    steps.push({
      stepName: 'Error Prior to Rounding (E)',
      formula: 'E = P - L',
      substitution: `E = ${formatDecimal(dP, 5)} - ${formatDecimal(dL)}`,
      result: formatDecimal(dE, 5),
      unit,
      notes: 'Raw uncorrected error',
    });

    // Step 3: Corrected Error Ec = E - E0
    dEc = dE.minus(dE0);
    steps.push({
      stepName: 'Corrected Error (Ec)',
      formula: 'Ec = E - E0',
      substitution: `Ec = ${formatDecimal(dE, 5)} - (${formatDecimal(dE0, 5)})`,
      result: formatDecimal(dEc, 5),
      unit,
      notes: 'Error corrected for zero deviation',
    });
  } else {
    // If delta L is not provided, error is direct I - L
    dE = dI.minus(dL);
    dP = dI;
    dEc = dE.minus(dE0);
    steps.push({
      stepName: 'Direct Indication Error (Ec)',
      formula: 'Ec = (I - L) - E0',
      substitution: `Ec = (${formatDecimal(dI)} - ${formatDecimal(dL)}) - ${formatDecimal(dE0)}`,
      result: formatDecimal(dEc, 5),
      unit,
      notes: 'Direct reading method without turning point fraction weights',
    });
  }

  // Step 4: Load in verification scale intervals (m = L / e)
  const mInE = dL.dividedBy(de);
  const { mpeE, zoneIndex, clauseRef } = getMPEInE(accuracyClass, mInE, isServiceVerification);
  const dMpeE = new Decimal(mpeE);
  const dMpeInUnit = dMpeE.times(de);

  steps.push({
    stepName: 'Maximum Permissible Error (MPE) Determination',
    formula: `m = L / e = ${formatDecimal(dL)} / ${formatDecimal(de)} = ${formatDecimal(mInE, 1)} e`,
    substitution: `Class ${accuracyClass.replace('_', ' ')}, Zone ${zoneIndex} -> MPE = ±${mpeE} e`,
    result: `±${formatDecimal(dMpeInUnit, 5)} ${unit} (±${mpeE} e)`,
    unit,
    notes: clauseRef,
  });

  // Step 5: Compliance Decision
  const absEc = dEc.abs();
  let compliance: ComplianceStatus = 'NOT_EVALUATED';

  if (absEc.lessThanOrEqualTo(dMpeInUnit.plus(1e-9))) {
    compliance = 'PASS';
  } else {
    compliance = 'FAIL';
  }

  steps.push({
    stepName: 'Compliance Evaluation',
    formula: '|Ec| <= |MPE|',
    substitution: `|${formatDecimal(dEc, 5)}| <= ${formatDecimal(dMpeInUnit, 5)}`,
    result: compliance,
    notes: compliance === 'PASS' ? 'Within permissible tolerance' : 'EXCEEDS MAXIMUM PERMISSIBLE ERROR',
  });

  const explanation: CalculationExplanation = {
    testType: 'Weighing / Accuracy Test',
    ruleId: 'R76-2006-TBL6-MPE-INITIAL',
    clauseRef: 'OIML R 76-1:2006, Clause 3.5.1 & Clause A.4.4.3',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Nominal Load (L)': `${nominalLoadL} ${unit}`,
      'Displayed Indication (I)': `${indicatedValueI} ${unit}`,
      'Scale Interval (e)': `${verificationScaleIntervalE} ${unit}`,
      'Flash Point Weight (ΔL)': turningPointDeltaL !== undefined ? `${turningPointDeltaL} ${unit}` : 'None',
      'Zero Error (E0)': `${zeroErrorE0} ${unit}`,
      'Accuracy Class': accuracyClass,
    },
    steps,
    finalResult: `Corrected Error Ec = ${formatDecimal(dEc, 5)} ${unit}`,
    limitRequirement: `MPE = ±${formatDecimal(dMpeInUnit, 5)} ${unit} (±${mpeE} e)`,
    compliance,
  };

  return {
    calculatedIndicationP: dP.toNumber(),
    errorPriorToRoundingE: dE.toNumber(),
    correctedErrorEc: dEc.toNumber(),
    mpeE,
    mpeInUnit: dMpeInUnit.toNumber(),
    compliance,
    explanation,
  };
}

export interface Table3ValidationInput {
  accuracyClass: AccuracyClass;
  verificationScaleIntervalE: number;
  maxCapacity: number;
  minCapacity?: number;
  unit: MassUnit;
}

export interface Table3ValidationOutput {
  isValid: boolean;
  numberOfIntervalsN: number;
  minAllowedN: number;
  maxAllowedN: number;
  minAllowedCapacity: number;
  verificationScaleIntervalEGrams: number;
  failureReasons: string[];
  clauseRef: string;
}

/**
 * Convert any MassUnit value to grams for standard Table 3 lookups
 */
export function convertToGrams(value: number, unit: MassUnit): number {
  switch (unit) {
    case 'mg':
      return value / 1000;
    case 'g':
      return value;
    case 'kg':
      return value * 1000;
    case 't':
      return value * 1000000;
    case 'lb':
      return value * 453.59237;
    case 'oz':
      return value * 28.349523125;
    default:
      return value;
  }
}

/**
 * Validates NAWI parameters against OIML R 76-1:2006 Clause 3.1.2 Table 3
 */
export function verifyTable3Specifications(input: Table3ValidationInput): Table3ValidationOutput {
  const { accuracyClass, verificationScaleIntervalE, maxCapacity, minCapacity, unit } = input;
  const failureReasons: string[] = [];
  const eGrams = convertToGrams(verificationScaleIntervalE, unit);
  const n = Math.round(maxCapacity / verificationScaleIntervalE);

  let minAllowedN = 100;
  let maxAllowedN = 10000;
  let minMultiplier = 20;

  switch (accuracyClass) {
    case 'CLASS_I':
      minAllowedN = 50000;
      maxAllowedN = Infinity;
      minMultiplier = 100;
      if (eGrams < 0.001 - 1e-9) {
        failureReasons.push(`Class I requires e >= 0.001 g (actual: ${eGrams} g)`);
      }
      break;

    case 'CLASS_II':
      maxAllowedN = 100000;
      if (eGrams < 0.001 - 1e-9) {
        failureReasons.push(`Class II requires e >= 0.001 g (actual: ${eGrams} g)`);
      } else if (eGrams <= 0.05 + 1e-9) {
        minAllowedN = 100;
        minMultiplier = 20;
      } else {
        // e >= 0.1 g
        minAllowedN = 5000;
        minMultiplier = 50;
      }
      break;

    case 'CLASS_III':
      maxAllowedN = 10000;
      if (eGrams < 0.1 - 1e-9) {
        failureReasons.push(`Class III requires e >= 0.1 g (actual: ${eGrams} g)`);
      } else if (eGrams <= 2.0 + 1e-9) {
        minAllowedN = 100;
        minMultiplier = 20;
      } else {
        // e >= 5 g
        minAllowedN = 500;
        minMultiplier = 20;
      }
      break;

    case 'CLASS_IIII':
      minAllowedN = 100;
      maxAllowedN = 1000;
      minMultiplier = 10;
      if (eGrams < 5.0 - 1e-9) {
        failureReasons.push(`Class IIII requires e >= 5 g (actual: ${eGrams} g)`);
      }
      break;
  }

  if (n < minAllowedN) {
    failureReasons.push(`Number of scale intervals n (${n}) is below minimum limit (${minAllowedN}) for ${accuracyClass}`);
  }
  if (n > maxAllowedN) {
    failureReasons.push(`Number of scale intervals n (${n}) exceeds maximum limit (${maxAllowedN}) for ${accuracyClass}`);
  }

  const minAllowedCapacity = minMultiplier * verificationScaleIntervalE;
  if (minCapacity !== undefined && minCapacity < minAllowedCapacity - 1e-9) {
    failureReasons.push(`Minimum capacity Min (${minCapacity} ${unit}) is below mandatory threshold ${minMultiplier}e (${minAllowedCapacity} ${unit})`);
  }

  return {
    isValid: failureReasons.length === 0,
    numberOfIntervalsN: n,
    minAllowedN,
    maxAllowedN,
    minAllowedCapacity,
    verificationScaleIntervalEGrams: eGrams,
    failureReasons,
    clauseRef: 'OIML R 76-1:2006, Clause 3.1.2, Table 3',
  };
}

export interface PartialRangeSpec {
  rangeIndex: number;
  maxCapacityI: number;
  verificationScaleIntervalEI: number;
}

/**
 * Validates Multi-Interval Instruments as per OIML R 76-1:2006 Clause 3.4.1
 */
export function verifyMultiIntervalRanges(
  accuracyClass: AccuracyClass,
  ranges: PartialRangeSpec[],
  unit: MassUnit
): { isValid: boolean; errors: string[]; clauseRef: string } {
  const errors: string[] = [];

  if (ranges.length < 2) {
    return {
      isValid: true,
      errors: [],
      clauseRef: 'OIML R 76-1:2006, Clause 3.4.1',
    };
  }

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    const table3Check = verifyTable3Specifications({
      accuracyClass,
      verificationScaleIntervalE: r.verificationScaleIntervalEI,
      maxCapacity: r.maxCapacityI,
      unit,
    });

    if (!table3Check.isValid) {
      errors.push(`Partial Range ${i + 1} (Max = ${r.maxCapacityI}, e = ${r.verificationScaleIntervalEI}): ${table3Check.failureReasons.join('; ')}`);
    }

    if (i > 0) {
      const prev = ranges[i - 1];
      if (r.verificationScaleIntervalEI <= prev.verificationScaleIntervalEI) {
        errors.push(`Partial range e_(i+1) (${r.verificationScaleIntervalEI}) must be strictly greater than e_i (${prev.verificationScaleIntervalEI})`);
      }
      const ratio = r.verificationScaleIntervalEI / prev.verificationScaleIntervalEI;
      if (ratio < 2 - 1e-9) {
        errors.push(`Scale interval ratio e_(i+1)/e_i (${ratio.toFixed(2)}) must be at least 2 (Clause 3.4.1)`);
      }
      if (r.maxCapacityI <= prev.maxCapacityI) {
        errors.push(`Partial range Max_(i+1) (${r.maxCapacityI}) must be greater than Max_i (${prev.maxCapacityI})`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    clauseRef: 'OIML R 76-1:2006, Clause 3.4.1, Clause 3.4.2 & Table 3',
  };
}

