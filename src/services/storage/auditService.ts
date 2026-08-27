import { AuditActionType, AuditLogEntry } from '../../types/audit';
import { UserRole } from '../../types/user';

const AUDIT_STORAGE_KEY = 'oiml_nawi_audit_logs_v1';

class AuditService {
  private logs: AuditLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load audit logs from localStorage:', err);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (err) {
      console.warn('Failed to save audit logs to localStorage:', err);
    }
  }

  public getLogs(): AuditLogEntry[] {
    return [...this.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      description: params.description,
      oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : undefined,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : undefined,
      reason: params.reason,
    };

    this.logs.unshift(entry);
    // Keep max 5000 entries in storage
    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(0, 5000);
    }
    this.saveLogs();
    return entry;
  }
}

export const auditService = new AuditService();
