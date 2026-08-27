// Metrology Types for OIML R-76 NAWI

export type MassUnit = 'mg' | 'g' | 'kg' | 't' | 'lb' | 'oz';

export type AccuracyClass = 'CLASS_I' | 'CLASS_II' | 'CLASS_III' | 'CLASS_IIII';

export type VerificationStatus = 'VERIFIED' | 'VERIFICATION_REQUIRED' | 'DRAFT' | 'RETIRED';

export type ComplianceStatus = 'PASS' | 'FAIL' | 'NOT_EVALUATED';

export type StandardEdition = 'OIML R 76-1:2006' | 'OIML R 76-1:1992' | 'FUTURE_REVISION';

export interface MetrologicalValue {
  value: number;
  unit: MassUnit;
  precision?: number;
}

export interface MPESpecification {
  zoneIndex: number;
  lowerBoundE: number; // in e
  upperBoundE: number; // in e
  mpeInitialE: number; // e.g. 0.5, 1.0, 1.5 e
  mpeServiceE: number; // e.g. 1.0, 2.0, 3.0 e
  clauseRef: string;
}

export interface CalculationTraceStep {
  stepName: string;
  formula: string;
  substitution: string;
  result: string;
  unit?: string;
  notes?: string;
}

export interface CalculationExplanation {
  testType: string;
  ruleId: string;
  clauseRef: string;
  standard: string;
  inputs: Record<string, string | number>;
  steps: CalculationTraceStep[];
  finalResult: string;
  limitRequirement: string;
  compliance: ComplianceStatus;
  notes?: string;
}
