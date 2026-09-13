import { AccuracyClass, ComplianceStatus, StandardEdition } from '../../types/metrology';
import { Instrument } from '../../types/instrument';
import { TestCategory } from '../../types/testSession';

export type SmartTestState =
  | 'NOT_STARTED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LOCKED'
  | 'NOT_APPLICABLE'
  | 'BLOCKED'
  | 'INSUFFICIENT_DATA'
  | 'UNVERIFIED';

export type ApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'INSUFFICIENT_DATA'
  | 'UNVERIFIED';

export type RuleVerificationStatus = 'VERIFIED' | 'UNVERIFIED';

export interface SequencingDependency {
  prerequisiteTestId: string;
  prerequisiteName: string;
  requiredState: 'COMPLETED';
  requirePassingCompliance?: boolean;
  description: string;
}

export interface ApplicabilityEvaluationResult {
  status: ApplicabilityStatus;
  reason: string;
  conditionMetDescription: string;
  missingFields?: (keyof Instrument)[];
  notes?: string;
}

export interface OIMLSequencingRule {
  ruleId: string;
  standard: string; // e.g. "OIML R 76-1"
  edition: StandardEdition; // e.g. "OIML R 76-1:2006"
  clauseRef: string; // e.g. "Clause 4.5.2 & Clause A.4.2"
  tableRef?: string; // e.g. "Table 6"
  testId: string; // stable test identifier, e.g. "R76-ZERO-SETTING"
  testCategory: TestCategory;
  testName: string;
  description: string;
  verificationStatus: RuleVerificationStatus;
  sourceReference: string;
  notes?: string;

  // Applicable accuracy classes under OIML R 76-1:2006
  applicableClasses?: AccuracyClass[];

  // Field requirements and deterministic evaluator
  requiredInstrumentFields: (keyof Instrument)[];
  evaluateApplicability: (instrument: Instrument) => ApplicabilityEvaluationResult;

  // Dependencies and sequencing
  prerequisites: SequencingDependency[];
  defaultSequenceOrder: number;
  isMandatory: boolean;
  enabled: boolean;

  // UI mapping
  workflowTab: 'weighing' | 'repeatability' | 'eccentricity' | 'zerotare' | 'environmental';
}

export interface SmartTestPlanItem {
  testId: string;
  testCategory: TestCategory;
  testName: string;
  clauseRef: string;
  tableRef?: string;
  standard: string;
  edition: string;
  sequenceOrder: number;

  // Applicability
  applicabilityStatus: ApplicabilityStatus;
  isMandatory: boolean;
  applicabilityReason: string;
  conditionMetDescription: string;
  missingFields?: string[];

  // Workflow State
  executionStatus: SmartTestState;
  complianceStatus: ComplianceStatus;
  dependencies: SequencingDependency[];
  blockingReasons?: string[];

  // Traceability & Metadata
  ruleId: string;
  verificationStatus: RuleVerificationStatus;
  sourceReference: string;
  traceabilityNotes?: string;
  workflowTab: 'weighing' | 'repeatability' | 'eccentricity' | 'zerotare' | 'environmental';
}

export interface RuleDecisionContext {
  ruleId: string;
  testId: string;
  ruleVersion: string;
  engineVersion: string;
  timestamp: string;
  instrumentFieldsEvaluated: Partial<Record<keyof Instrument, any>>;
  applicabilityResult: ApplicabilityStatus;
  applicabilityReason: string;
  dependenciesEvaluated: {
    prerequisiteTestId: string;
    prerequisiteName: string;
    satisfied: boolean;
    stateFound: SmartTestState;
    complianceFound?: ComplianceStatus;
    reason?: string;
  }[];
  resultingState: SmartTestState;
  verificationStatus: RuleVerificationStatus;
}

export interface SmartTestPlan {
  id: string;
  instrumentId: string;
  instrumentSnapshot: Instrument;
  standardEdition: StandardEdition;
  ruleSetVersion: string;
  engineVersion: string;
  generatedAt: string;
  updatedAt: string;
  isFinalized: boolean; // Freeze when report is approved/finalized
  items: SmartTestPlanItem[];
  summary: {
    totalTests: number;
    applicableCount: number;
    readyCount: number;
    lockedCount: number;
    completedCount: number;
    blockedCount: number;
    notApplicableCount: number;
    insufficientDataCount: number;
    unverifiedCount: number;
  };
  auditDecisionContexts: Record<string, RuleDecisionContext>;
}
