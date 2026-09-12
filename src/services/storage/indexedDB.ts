import { openDB, IDBPDatabase } from 'idb';
import { Instrument } from '../../types/instrument';
import { TestSession } from '../../types/testSession';
import { TestReport, Attachment } from '../../types/report';
import { TestEquipment } from '../../types/equipment';
import { Laboratory, UserProfile } from '../../types/user';
import { AuditLogEntry } from '../../types/audit';
import { SyncQueueItem, AppMetadata } from '../../types/storage';

const DB_NAME = 'oiml_nawi_db_v2';
const DB_VERSION = 1;

export type StoreName =
  | 'instruments'
  | 'testSessions'
  | 'reports'
  | 'equipment'
  | 'laboratories'
  | 'users'
  | 'attachments'
  | 'auditLogs'
  | 'syncQueue'
  | 'appMetadata';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getIndexedDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Instruments Store
        if (!db.objectStoreNames.contains('instruments')) {
          const store = db.createObjectStore('instruments', { keyPath: 'id' });
          store.createIndex('by_updatedAt', 'updatedAt');
          store.createIndex('by_tag', 'instrumentIdTag');
        }

        // 2. Test Sessions Store
        if (!db.objectStoreNames.contains('testSessions')) {
          const store = db.createObjectStore('testSessions', { keyPath: 'id' });
          store.createIndex('by_instrumentId', 'instrumentId');
          store.createIndex('by_status', 'status');
          store.createIndex('by_createdAt', 'createdAt');
        }

        // 3. Reports Store
        if (!db.objectStoreNames.contains('reports')) {
          const store = db.createObjectStore('reports', { keyPath: 'id' });
          store.createIndex('by_testSessionId', 'testSessionId');
          store.createIndex('by_instrumentId', 'instrumentId');
          store.createIndex('by_generatedAt', 'generatedAt');
        }

        // 4. Equipment Store
        if (!db.objectStoreNames.contains('equipment')) {
          const store = db.createObjectStore('equipment', { keyPath: 'id' });
          store.createIndex('by_tag', 'equipmentIdTag');
        }

        // 5. Laboratories Store
        if (!db.objectStoreNames.contains('laboratories')) {
          db.createObjectStore('laboratories', { keyPath: 'id' });
        }

        // 6. Users Store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // 7. Attachments Store
        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'id' });
          store.createIndex('by_associatedEntityId', 'associatedEntityId');
        }

        // 8. Audit Logs Store
        if (!db.objectStoreNames.contains('auditLogs')) {
          const store = db.createObjectStore('auditLogs', { keyPath: 'id' });
          store.createIndex('by_timestamp', 'timestamp');
          store.createIndex('by_entityId', 'entityId');
        }

        // 9. Sync Queue Store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('by_status', 'status');
          store.createIndex('by_createdAt', 'createdAt');
          store.createIndex('by_entityType', 'entityType');
          store.createIndex('by_entityId', 'entityId');
        }

        // 10. App Metadata Store (Counters, migration status, device info)
        if (!db.objectStoreNames.contains('appMetadata')) {
          db.createObjectStore('appMetadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export class IndexedDBService {
  public async get<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    try {
      const db = await getIndexedDB();
      return (await db.get(storeName, id)) as T | undefined;
    } catch (err) {
      console.error(`[IndexedDB] Failed to get ${storeName}/${id}:`, err);
      return undefined;
    }
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
      const db = await getIndexedDB();
      return (await db.getAll(storeName)) as T[];
    } catch (err) {
      console.error(`[IndexedDB] Failed to getAll ${storeName}:`, err);
      return [];
    }
  }

  public async put<T>(storeName: StoreName, item: T): Promise<void> {
    try {
      const db = await getIndexedDB();
      await db.put(storeName, item);
    } catch (err) {
      console.error(`[IndexedDB] Failed to put in ${storeName}:`, err);
      throw err;
    }
  }

  public async putMany<T>(storeName: StoreName, items: T[]): Promise<void> {
    if (items.length === 0) return;
    try {
      const db = await getIndexedDB();
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        await store.put(item);
      }
      await tx.done;
    } catch (err) {
      console.error(`[IndexedDB] Failed to putMany in ${storeName}:`, err);
      throw err;
    }
  }

  public async delete(storeName: StoreName, id: string): Promise<void> {
    try {
      const db = await getIndexedDB();
      await db.delete(storeName, id);
    } catch (err) {
      console.error(`[IndexedDB] Failed to delete in ${storeName}/${id}:`, err);
      throw err;
    }
  }

  public async clear(storeName: StoreName): Promise<void> {
    try {
      const db = await getIndexedDB();
      await db.clear(storeName);
    } catch (err) {
      console.error(`[IndexedDB] Failed to clear ${storeName}:`, err);
    }
  }

  // --- Metadata helpers ---
  public async getMetadata<T = any>(key: string): Promise<T | undefined> {
    try {
      const meta = await this.get<AppMetadata>('appMetadata', key);
      return meta ? (meta.value as T) : undefined;
    } catch (err) {
      console.error(`[IndexedDB] Failed to get metadata ${key}:`, err);
      return undefined;
    }
  }

  public async setMetadata(key: string, value: any): Promise<void> {
    try {
      const meta: AppMetadata = {
        key,
        value,
        updatedAt: new Date().toISOString(),
      };
      await this.put('appMetadata', meta);
    } catch (err) {
      console.error(`[IndexedDB] Failed to set metadata ${key}:`, err);
    }
  }

  // --- Sync Queue helpers ---
  public async getPendingQueue(): Promise<SyncQueueItem[]> {
    try {
      const db = await getIndexedDB();
      const tx = db.transaction('syncQueue', 'readonly');
      const index = tx.store.index('by_status');
      const pending = await index.getAll('PENDING');
      const failed = await index.getAll('FAILED');
      const syncing = await index.getAll('SYNCING');
      
      // Strict entity dependency priority to respect relational foreign keys:
      // Laboratories -> Users -> Equipment -> Instruments -> Test Sessions -> Reports -> Attachments -> Audit Logs
      const ENTITY_PRIORITY: Record<string, number> = {
        LABORATORY: 1,
        USER: 2,
        EQUIPMENT: 3,
        INSTRUMENT: 4,
        TEST_SESSION: 5,
        REPORT: 6,
        ATTACHMENT: 7,
        AUDIT_LOG: 8,
      };

      return [...pending, ...syncing, ...failed].sort((a, b) => {
        const pA = ENTITY_PRIORITY[a.entityType] ?? 99;
        const pB = ENTITY_PRIORITY[b.entityType] ?? 99;
        if (pA !== pB) return pA - pB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } catch (err) {
      console.error('[IndexedDB] Failed to get pending sync queue:', err);
      return [];
    }
  }

  public async getQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    return this.get<SyncQueueItem>('syncQueue', id);
  }

  public async enqueueSync(item: SyncQueueItem): Promise<void> {
    // If an item for this exact entity already exists in PENDING status, we can coalesce or update payload
    try {
      const db = await getIndexedDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const index = store.index('by_entityId');
      const existingForEntity = await index.getAll(item.entityId);

      const pendingForEntity = existingForEntity.find((q) => q.status === 'PENDING' || q.status === 'SYNCING');
      if (pendingForEntity && pendingForEntity.operationType === item.operationType) {
        // Coalesce payload to the newer update
        pendingForEntity.payload = item.payload;
        pendingForEntity.updatedAt = new Date().toISOString();
        pendingForEntity.status = 'PENDING';
        await store.put(pendingForEntity);
        await tx.done;
        return;
      }

      await store.put(item);
      await tx.done;
    } catch (err) {
      console.error('[IndexedDB] Failed to enqueue sync item:', err);
      throw err;
    }
  }

  public async updateQueueItem(item: SyncQueueItem): Promise<void> {
    await this.put('syncQueue', item);
  }

  public async removeQueueItem(id: string): Promise<void> {
    await this.delete('syncQueue', id);
  }

  public async clearSyncedQueue(): Promise<void> {
    try {
      const db = await getIndexedDB();
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const index = store.index('by_status');
      const syncedKeys = await index.getAllKeys('SYNCED');
      for (const key of syncedKeys) {
        await store.delete(key);
      }
      await tx.done;
    } catch (err) {
      console.warn('[IndexedDB] Error clearing synced queue items:', err);
    }
  }
}

export const indexedDBService = new IndexedDBService();
