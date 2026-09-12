import { AccuracyClass, ComplianceStatus } from './metrology';

export type PublicVerificationStatus =
  | 'PASSED'
  | 'FAILED'
  | 'UNDER_REVIEW'
  | 'NO_VALID_REPORT'
  | 'INSTRUMENT_NOT_FOUND'
  | 'QR_DISABLED'
  | 'SERVICE_UNAVAILABLE';

export interface PublicInstrumentData {
  id: string;
  publicVerificationId: string;
  instrumentIdTag: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  accuracyClass: AccuracyClass;
  maxCapacity: number;
  minCapacity: number;
  verificationScaleInterval: number;
  actualScaleInterval: number;
  unit: string;
  patternApprovalNumber?: string;
  qrEnabled: boolean;
}

export interface PublicReportSummary {
  id: string;
  reportNumber: string;
  currentRevision: number;
  standardEdition: string;
  isApproved: boolean;
  overallCompliance: ComplianceStatus;
  complianceStatement: string;
  sha256IntegrityHash: string;
  generatedAt: string;
  technicianName?: string;
  reviewerName?: string;
  laboratoryName?: string;
  accreditationNumber?: string;
}

export interface PublicTestHistoryItem {
  id: string;
  reportNumber: string;
  date: string;
  compliance: ComplianceStatus;
  isApproved: boolean;
  statusText: string;
}

export interface PublicVerificationResult {
  status: PublicVerificationStatus;
  message?: string;
  verifiedAt: string;
  source: 'SUPABASE_CLOUD' | 'LOCAL_OFFLINE_DATABASE' | 'ERROR';
  isOfflineFallback: boolean;
  instrument?: PublicInstrumentData;
  latestFinalizedReport?: PublicReportSummary;
  pendingSession?: {
    testSessionNumber: string;
    status: string;
    updatedAt: string;
  };
  history: PublicTestHistoryItem[];
  verificationUrl: string;
}
