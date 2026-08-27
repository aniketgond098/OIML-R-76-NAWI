import { ComplianceStatus, MassUnit } from '../../types/metrology';
import { CalculationExplanation, CalculationTraceStep } from '../../types/metrology';
import { Decimal, formatDecimal } from '../units/decimal';

export interface DiscriminationCalculationInput {
  nominalLoadL: number;
  initialIndicationI1: number;
  actualScaleIntervalD: number;
  additionalLoadApplied?: number; // default is 1.4 * d
  indicationAfterAdditionalLoadI2: number;
  unit: MassUnit;
  isDigital?: boolean; // default true for digital NAWIs
}

export interface DiscriminationCalculationOutput {
  nominalLoadL: number;
  actualScaleIntervalD: number;
  extraLoadRequired: number; // 1.4 * d
  actualExtraLoadApplied: number;
  indicationChangeDeltaI: number; // I2 - I1
  minimumRequiredChange: number; // 1.0 * d
  compliance: ComplianceStatus;
  explanation: CalculationExplanation;
}

/**
 * Discrimination Test Calculation
 * OIML R 76-1:2006 Clause 3.8.2.2 & Clause A.4.8
 * An additional load of 1.4 d placed gently on the load receptor shall
 * produce an indication increase of at least 1.0 d (i.e. Delta I >= d).
 */
export function calculateDiscrimination(input: DiscriminationCalculationInput): DiscriminationCalculationOutput {
  const {
    nominalLoadL,
    initialIndicationI1,
    actualScaleIntervalD,
    additionalLoadApplied,
    indicationAfterAdditionalLoadI2,
    unit,
  } = input;

  const steps: CalculationTraceStep[] = [];
  const dD = new Decimal(actualScaleIntervalD);
  const dI1 = new Decimal(initialIndicationI1);
  const dI2 = new Decimal(indicationAfterAdditionalLoadI2);
  const dExtraRequired = dD.times(1.4);
  const dExtraApplied = additionalLoadApplied !== undefined ? new Decimal(additionalLoadApplied) : dExtraRequired;
  
  // Delta I = I2 - I1
  const dDeltaI = dI2.minus(dI1);
  const dMinRequiredChange = dD;

  steps.push({
    stepName: 'Extra Discrimination Load Requirement',
    formula: 'ΔL_disc = 1.4 · d',
    substitution: `1.4 · ${formatDecimal(dD)} ${unit} = ${formatDecimal(dExtraRequired, 5)} ${unit}`,
    result: `${formatDecimal(dExtraRequired, 5)} ${unit}`,
    unit,
    notes: 'OIML R 76-1:2006 Clause 3.8.2.2 (Digital Indication)',
  });

  steps.push({
    stepName: 'Indication Response (ΔI)',
    formula: 'ΔI = I_after - I_before',
    substitution: `${formatDecimal(dI2)} - ${formatDecimal(dI1)} = ${formatDecimal(dDeltaI, 5)} ${unit}`,
    result: `${formatDecimal(dDeltaI, 5)} ${unit}`,
    unit,
    notes: 'Difference in indication after applying discrimination load',
  });

  // Decision criterion: Delta I >= d (within small numeric tolerance)
  const isPass = dDeltaI.greaterThanOrEqualTo(dMinRequiredChange.minus(1e-9));
  const compliance: ComplianceStatus = isPass ? 'PASS' : 'FAIL';

  steps.push({
    stepName: 'Discrimination Compliance Decision',
    formula: 'ΔI >= 1.0 · d',
    substitution: `${formatDecimal(dDeltaI, 5)} ${unit} >= ${formatDecimal(dMinRequiredChange, 5)} ${unit}`,
    result: compliance,
    notes: isPass
      ? 'Indication responded with >= 1d graduation step (Compliant)'
      : 'INDICATION FAILED TO ADVANCE BY AT LEAST 1d (Non-compliant)',
  });

  const explanation: CalculationExplanation = {
    testType: 'Discrimination Test',
    ruleId: 'R76-2006-382-DISCRIMINATION',
    clauseRef: 'OIML R 76-1:2006, Clause 3.8.2.2 & Clause A.4.8',
    standard: 'OIML R 76-1:2006',
    inputs: {
      'Nominal Load (L)': `${nominalLoadL} ${unit}`,
      'Initial Indication (I1)': `${initialIndicationI1} ${unit}`,
      'Actual Interval (d)': `${actualScaleIntervalD} ${unit}`,
      'Extra Load (1.4d)': `${formatDecimal(dExtraApplied, 5)} ${unit}`,
      'Indication After Load (I2)': `${indicationAfterAdditionalLoadI2} ${unit}`,
    },
    steps,
    finalResult: `Indication Change ΔI = ${formatDecimal(dDeltaI, 5)} ${unit}`,
    limitRequirement: `ΔI >= ${formatDecimal(dMinRequiredChange, 5)} ${unit} (1.0 d)`,
    compliance,
  };

  return {
    nominalLoadL,
    actualScaleIntervalD,
    extraLoadRequired: dExtraRequired.toNumber(),
    actualExtraLoadApplied: dExtraApplied.toNumber(),
    indicationChangeDeltaI: dDeltaI.toNumber(),
    minimumRequiredChange: dMinRequiredChange.toNumber(),
    compliance,
    explanation,
  };
}
