import { indexedDBService } from './indexedDB';
import { syncEngine } from './syncEngine';
import { SyncQueueItem } from '../../types/storage';
import { Instrument } from '../../types/instrument';
import { TestSession } from '../../types/testSession';
import { TestReport, Attachment } from '../../types/report';
import { TestEquipment } from '../../types/equipment';
import { Laboratory, UserProfile } from '../../types/user';
import { AuditLogEntry } from '../../types/audit';

const OLD_KEYS = {
  INSTRUMENTS: 'oiml_nawi_instruments_v1',
  TEST_SESSIONS: 'oiml_nawi_test_sessions_v1',
  REPORTS: 'oiml_nawi_reports_v1',
  EQUIPMENT: 'oiml_nawi_equipment_v1',
  LABORATORIES: 'oiml_nawi_laboratories_v1',
  USERS: 'oiml_nawi_users_v1',
  ATTACHMENTS: 'oiml_nawi_attachments_v1',
  COUNTERS: 'oiml_nawi_counters_v1',
  AUDIT_LOGS: 'oiml_nawi_audit_logs_v1',
};

export const CURRENT_STORAGE_SCHEMA_VERSION = 2;

export interface MigrationResult {
  migrated: boolean;
  itemCounts: {
    instruments: number;
    testSessions: number;
    reports: number;
    equipment: number;
    laboratories: number;
    users: number;
    attachments: number;
    auditLogs: number;
  };
  details: string;
}

export class MigrationService {
  public async checkAndRunMigration(): Promise<MigrationResult> {
    const existingVersion = await indexedDBService.getMetadata<number>('storageSchemaVersion');

    if (existingVersion && existingVersion >= CURRENT_STORAGE_SCHEMA_VERSION) {
      return {
        migrated: false,
        itemCounts: { instruments: 0, testSessions: 0, reports: 0, equipment: 0, laboratories: 0, users: 0, attachments: 0, auditLogs: 0 },
        details: `Already at storage schema version ${existingVersion}`,
      };
    }

    console.log('[MigrationService] Checking for legacy localStorage data to migrate to IndexedDB...');

    const loadLocal = <T>(key: string): T[] => {
      try {
        if (typeof localStorage === 'undefined') return [];
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn(`[MigrationService] Failed reading ${key} from localStorage:`, e);
        return [];
      }
    };

    const instruments = loadLocal<Instrument>(OLD_KEYS.INSTRUMENTS);
    const testSessions = loadLocal<TestSession>(OLD_KEYS.TEST_SESSIONS);
    const reports = loadLocal<TestReport>(OLD_KEYS.REPORTS);
    const equipment = loadLocal<TestEquipment>(OLD_KEYS.EQUIPMENT);
    const laboratories = loadLocal<Laboratory>(OLD_KEYS.LABORATORIES);
    const users = loadLocal<UserProfile>(OLD_KEYS.USERS);
    const attachments = loadLocal<Attachment>(OLD_KEYS.ATTACHMENTS);
    const auditLogs = loadLocal<AuditLogEntry>(OLD_KEYS.AUDIT_LOGS);

    const deviceId = syncEngine.getDeviceId();
    const now = new Date().toISOString();

    const counts = {
      instruments: instruments.length,
      testSessions: testSessions.length,
      reports: reports.length,
      equipment: equipment.length,
      laboratories: laboratories.length,
      users: users.length,
      attachments: attachments.length,
      auditLogs: auditLogs.length,
    };

    const hasAnyData = Object.values(counts).some((c) => c > 0);

    if (hasAnyData) {
      console.log('[MigrationService] Found legacy data. Migrating to IndexedDB:', counts);

      // Save into IndexedDB stores
      if (instruments.length) await indexedDBService.putMany('instruments', instruments);
      if (testSessions.length) await indexedDBService.putMany('testSessions', testSessions);
      if (reports.length) await indexedDBService.putMany('reports', reports);
      if (equipment.length) await indexedDBService.putMany('equipment', equipment);
      if (laboratories.length) await indexedDBService.putMany('laboratories', laboratories);
      if (users.length) await indexedDBService.putMany('users', users);
      if (attachments.length) await indexedDBService.putMany('attachments', attachments);
      if (auditLogs.length) await indexedDBService.putMany('auditLogs', auditLogs);

      // Also migrate counters
      try {
        const countersRaw = localStorage.getItem(OLD_KEYS.COUNTERS);
        if (countersRaw) {
          const parsed = JSON.parse(countersRaw);
          await indexedDBService.setMetadata('counters', parsed);
        }
      } catch (e) {
        console.warn('[MigrationService] Could not parse counters:', e);
      }

      // Enqueue items for Supabase cloud sync
      const createQueueItem = (entityType: any, entityId: string, payload: any): SyncQueueItem => ({
        id: `MIG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        entityType,
        entityId,
        operationType: 'CREATE',
        payload,
        createdAt: now,
        updatedAt: now,
        status: 'PENDING',
        retryCount: 0,
        deviceId,
      });

      for (const inst of instruments) {
        await indexedDBService.enqueueSync(createQueueItem('INSTRUMENT', inst.id, inst));
      }
      for (const sess of testSessions) {
        await indexedDBService.enqueueSync(createQueueItem('TEST_SESSION', sess.id, sess));
      }
      for (const rpt of reports) {
        await indexedDBService.enqueueSync(createQueueItem('REPORT', rpt.id, rpt));
      }
      for (const eq of equipment) {
        await indexedDBService.enqueueSync(createQueueItem('EQUIPMENT', eq.id, eq));
      }
      for (const lab of laboratories) {
        await indexedDBService.enqueueSync(createQueueItem('LABORATORY', lab.id, lab));
      }
      for (const usr of users) {
        await indexedDBService.enqueueSync(createQueueItem('USER', usr.id, usr));
      }
      for (const att of attachments) {
        await indexedDBService.enqueueSync(createQueueItem('ATTACHMENT', att.id, att));
      }
      for (const log of auditLogs) {
        await indexedDBService.enqueueSync(createQueueItem('AUDIT_LOG', log.id, log));
      }
    }

    // Mark migration completed
    await indexedDBService.setMetadata('storageSchemaVersion', CURRENT_STORAGE_SCHEMA_VERSION);
    await indexedDBService.setMetadata('migrationCompletedAt', now);
    await indexedDBService.setMetadata('migrationItemCounts', counts);

    // Trigger cloud sync to upload migrated items if online
    syncEngine.triggerSync();

    return {
      migrated: true,
      itemCounts: counts,
      details: hasAnyData
        ? `Successfully migrated legacy localStorage items into IndexedDB and queued for Supabase sync.`
        : `Initialized fresh storage schema v${CURRENT_STORAGE_SCHEMA_VERSION} in IndexedDB.`,
    };
  }
}

export const migrationService = new MigrationService();
