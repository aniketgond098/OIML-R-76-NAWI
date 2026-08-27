import { AccuracyClass, ComplianceStatus, StandardEdition, VerificationStatus } from '../../types/metrology';

export type MetrologyFormulaType =
  | 'MPE_TABLE_LOOKUP'
  | 'TURNING_POINT_FLASH'
  | 'REPEATABILITY_SPAN'
  | 'ECCENTRICITY_LOAD'
  | 'ZERO_SETTING_ACCURACY'
  | 'ZERO_SETTING_RANGE'
  | 'TARE_ACCURACY'
  | 'TEMPERATURE_SPAN_DRIFT'
  | 'DISCRIMINATION_THRESHOLD'
  | 'TILTING_ERROR_LIMIT';

export interface MetrologyRule {
  ruleId: string; // e.g. "R76-2006-TBL6-MPE-CLASS-III"
  standard: string; // "OIML R 76-1"
  edition: StandardEdition;
  clauseRef: string; // e.g. "Clause 3.5.1, Table 6"
  title: string;
  description: string;
  applicableClasses: AccuracyClass[];
  formulaType: MetrologyFormulaType;
  verificationStatus: VerificationStatus;
  
  // Explicit rule parameters
  parameters: Record<string, any>;
  
  // Mathematical logic definition
  decisionCriteria: string;
  sourceReference: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  clauseRef: string;
  standard: string;
  compliance: ComplianceStatus;
  calculatedValue: number;
  permissibleLimit: number;
  unit: string;
  explanation: string[];
  verificationStatus: VerificationStatus;
}
