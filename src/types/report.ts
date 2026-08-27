import { ComplianceStatus, StandardEdition } from './metrology';
import { TestSession } from './testSession';
import { Instrument } from './instrument';
import { TestEquipment } from './equipment';

export interface Attachment {
  id: string;
  name: string;
  fileType: 'image/jpeg' | 'image/png' | 'application/pdf' | 'text/plain';
  sizeBytes: number;
  dataUrl: string; // Base64 or Blob storage URL
  uploadedBy: string;
  uploadedAt: string;
  category: 'INSTRUMENT_PHOTO' | 'CALIBRATION_CERT' | 'SCHEMATIC' | 'TEST_SETUP' | 'SUPPORTING_DOC';
  associatedEntity: 'INSTRUMENT' | 'TEST_SESSION' | 'REPORT';
  associatedEntityId: string;
}

export interface ReportRevision {
  revisionNumber: number; // 0 for initial, 1, 2...
  createdAt: string;
  createdBy: string;
  createdByName: string;
  reasonForRevision?: string;
  reportSnapshotData: string; // JSON serialized full snapshot
  sha256Hash: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ComplianceMatrixEntry {
  category: string;
  name: string;
  testName?: string;
  clauseRef: string;
  standard?: string;
  edition?: StandardEdition;
  isApplicable: boolean;
  status: string;
  ruleId: string;
  compliance?: ComplianceStatus;
  summaryResult?: string;
  mpeRequirement?: string;
  calculatedError?: string;
  notes?: string;
}

export interface PrototypeApprovalRecord {
  signerName: string;
  signerTitle: string;
  signerRole: string;
  laboratoryName: string;
  signedAt: string;
  digestMethod: 'SHA-256';
  approvalType: 'PROTOTYPE_ELECTRONIC_APPROVAL';
  signatureToken: string;
}

export interface TestReport {
  id: string;
  reportNumber: string; // e.g. "NAWI-RPT-2026-000001"
  currentRevision: number;
  testSessionId: string;
  instrumentId: string;
  laboratoryId: string;
  
  standardEdition: StandardEdition;
  ruleSetVersion: string; // e.g. "OIML-R76-2006-v1.0"
  isDemoData: boolean; // Flag to identify prototype / demo data clearly
  
  // Snapshots at time of finalization
  instrumentSnapshot: Instrument;
  testSessionSnapshot: TestSession;
  equipmentSnapshots: TestEquipment[];
  
  // Structured Compliance Summary Matrix
  complianceMatrix: ComplianceMatrixEntry[];
  
  // Overall result
  overallCompliance: ComplianceStatus;
  complianceReason?: string; // Detailed rationale (e.g. why NOT_EVALUATED or why FAIL)
  complianceStatement: string; // Official legal metrology declaration
  
  // Signatures & Authorization
  technicianName: string;
  technicianSignedAt?: string;
  technicianApproval?: PrototypeApprovalRecord;
  reviewerName: string;
  reviewerSignedAt?: string;
  reviewerApproval?: PrototypeApprovalRecord;
  approvalRecord?: {
    status: string;
    reviewedBy: string;
    reviewerId: string;
    reviewedAt: string;
    comments?: string;
  };
  isApproved: boolean;
  
  // Integrity & Immutability
  sha256IntegrityHash: string;
  generatedAt: string;
  
  // Revisions history
  revisions: ReportRevision[];
  attachments: Attachment[];
}
