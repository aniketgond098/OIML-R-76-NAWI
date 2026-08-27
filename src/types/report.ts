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

export interface TestReport {
  id: string;
  reportNumber: string; // e.g. "NAWI-RPT-2026-000001"
  currentRevision: number;
  testSessionId: string;
  instrumentId: string;
  laboratoryId: string;
  
  standardEdition: StandardEdition;
  ruleSetVersion: string;
  
  // Snapshots at time of finalization
  instrumentSnapshot: Instrument;
  testSessionSnapshot: TestSession;
  equipmentSnapshots: TestEquipment[];
  
  // Overall result
  overallCompliance: ComplianceStatus;
  complianceStatement: string; // Legal metrology declaration
  
  // Signatures & Authorization
  technicianName: string;
  technicianSignedAt?: string;
  reviewerName: string;
  reviewerSignedAt?: string;
  isApproved: boolean;
  
  // Integrity & Immutability
  sha256IntegrityHash: string;
  generatedAt: string;
  
  // Revisions history
  revisions: ReportRevision[];
  attachments: Attachment[];
}
