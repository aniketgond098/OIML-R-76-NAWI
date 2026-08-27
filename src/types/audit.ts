import { UserRole } from './user';

export type AuditActionType =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'INSTRUMENT_CREATED'
  | 'INSTRUMENT_UPDATED'
  | 'TEST_SESSION_CREATED'
  | 'OBSERVATION_RECORDED'
  | 'OBSERVATION_MODIFIED'
  | 'TEST_COMPLETED'
  | 'TEST_SUBMITTED_FOR_REVIEW'
  | 'TEST_APPROVED'
  | 'TEST_REJECTED'
  | 'REPORT_GENERATED'
  | 'REPORT_REVISION_CREATED'
  | 'RULE_CREATED'
  | 'RULE_STATUS_CHANGED'
  | 'ATTACHMENT_UPLOADED'
  | 'ATTACHMENT_DELETED'
  | 'EQUIPMENT_CALIBRATION_UPDATED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditActionType;
  entityType: 'INSTRUMENT' | 'TEST_SESSION' | 'OBSERVATION' | 'REPORT' | 'RULE' | 'ATTACHMENT' | 'EQUIPMENT' | 'AUTH';
  entityId: string;
  entityName?: string;
  description: string;
  oldValue?: string; // JSON serialized
  newValue?: string; // JSON serialized
  reason?: string;
  ipAddress?: string;
}
