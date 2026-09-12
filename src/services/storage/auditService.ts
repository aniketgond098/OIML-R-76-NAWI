import { AuditActionType, AuditLogEntry } from '../../types/audit';
import { UserRole } from '../../types/user';
import { storageService } from './storageService';

class AuditService {
  public getLogs(): AuditLogEntry[] {
    return storageService.getAuditLogs();
  }

  public logEvent(params: {
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    action: AuditActionType;
    entityType: 'INSTRUMENT' | 'TEST_SESSION' | 'OBSERVATION' | 'REPORT' | 'RULE' | 'ATTACHMENT' | 'EQUIPMENT' | 'AUTH';
    entityId: string;
    entityName?: string;
    description: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
  }): AuditLogEntry {
    return storageService.logAuditEvent(params);
  }
}

export const auditService = new AuditService();
