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

export function isIndexedDBSupported(): boolean {
  try {
    return (
      typeof indexedDB !== 'undefined' &&
      indexedDB !== null &&
      typeof indexedDB.open === 'function'
    );
  } catch {
    return false;
  }
}

// In-memory fallback stores when IndexedDB is unavailable (Node test runs, SSR, restricted iframe sandboxes)
const memoryStores: Record<StoreName, Map<string, any>> = {
  instruments: new Map(),
  testSessions: new Map(),
  reports: new Map(),
  equipment: new Map(),
  laboratories: new Map(),
  users: new Map(),
  attachments: new Map(),
  auditLogs: new Map(),
  syncQueue: new Map(),
  appMetadata: new Map(),
};

let dbPromise: Promise<IDBPDatabase | null> | null = null;
let useMemoryFallback = false;

export async function getIndexedDB(): Promise<IDBPDatabase | null> {
  if (useMemoryFallback) return null;
  if (!isIndexedDBSupported()) {
    useMemoryFallback = true;
    return null;
  }

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
    }).catch((_err) => {
      useMemoryFallback = true;
      return null;
    });
  }
  return dbPromise;
}

export class IndexedDBService {
  public async get<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    try {
      const db = await getIndexedDB();
      if (!db) {
        return (memoryStores[storeName]?.get(id) as T) ?? undefined;
      }
      return (await db.get(storeName, id)) as T | undefined;
    } catch {
      return (memoryStores[storeName]?.get(id) as T) ?? undefined;
    }
  }

  public async getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
      const db = await getIndexedDB();
      if (!db) {
        return Array.from(memoryStores[storeName]?.values() || []) as T[];
      }
      return (await db.getAll(storeName)) as T[];
    } catch {
      return Array.from(memoryStores[storeName]?.values() || []) as T[];
    }
  }

  public async put<T>(storeName: StoreName, item: T): Promise<void> {
    try {
      const key = (item as any)?.id ?? (item as any)?.key;
      if (key !== undefined && memoryStores[storeName]) {
        memoryStores[storeName].set(String(key), item);
      }
      const db = await getIndexedDB();
      if (!db) return;
      await db.put(storeName, item);
    } catch {
      // Memory store is already up-to-date
    }
  }

  public async putMany<T>(storeName: StoreName, items: T[]): Promise<void> {
    if (items.length === 0) return;
    try {
      if (memoryStores[storeName]) {
        for (const item of items) {
          const key = (item as any)?.id ?? (item as any)?.key;
          if (key !== undefined) {
            memoryStores[storeName].set(String(key), item);
          }
        }
      }
      const db = await getIndexedDB();
      if (!db) return;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        await store.put(item);
      }
      await tx.done;
    } catch {
      // Memory store is already up-to-date
    }
  }

  public async delete(storeName: StoreName, id: string): Promise<void> {
    try {
      memoryStores[storeName]?.delete(id);
      const db = await getIndexedDB();
      if (!db) return;
      await db.delete(storeName, id);
    } catch {
      // Ignored
    }
  }

  public async clear(storeName: StoreName): Promise<void> {
    try {
      memoryStores[storeName]?.clear();
      const db = await getIndexedDB();
      if (!db) return;
      await db.clear(storeName);
    } catch {
      // Ignored
    }
  }

  // --- Metadata helpers ---
  public async getMetadata<T = any>(key: string): Promise<T | undefined> {
    try {
      const meta = await this.get<AppMetadata>('appMetadata', key);
      return meta ? (meta.value as T) : undefined;
    } catch {
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
    } catch {
      // Ignored
    }
  }

  // --- Sync Queue helpers ---
  public async getPendingQueue(): Promise<SyncQueueItem[]> {
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

    const sortQueue = (items: SyncQueueItem[]) =>
      items.sort((a, b) => {
        const pA = ENTITY_PRIORITY[a.entityType] ?? 99;
        const pB = ENTITY_PRIORITY[b.entityType] ?? 99;
        if (pA !== pB) return pA - pB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    try {
      const db = await getIndexedDB();
      if (!db) {
        const memItems = Array.from(memoryStores.syncQueue.values()).filter(
          (q) => q.status === 'PENDING' || q.status === 'SYNCING' || q.status === 'FAILED'
        );
        return sortQueue(memItems);
      }
      const tx = db.transaction('syncQueue', 'readonly');
      const index = tx.store.index('by_status');
      const pending = await index.getAll('PENDING');
      const failed = await index.getAll('FAILED');
      const syncing = await index.getAll('SYNCING');
      return sortQueue([...pending, ...syncing, ...failed]);
    } catch {
      const memItems = Array.from(memoryStores.syncQueue.values()).filter(
        (q) => q.status === 'PENDING' || q.status === 'SYNCING' || q.status === 'FAILED'
      );
      return sortQueue(memItems);
    }
  }

  public async getQueueItem(id: string): Promise<SyncQueueItem | undefined> {
    return this.get<SyncQueueItem>('syncQueue', id);
  }

  public async enqueueSync(item: SyncQueueItem): Promise<void> {
    try {
      const existingMem = Array.from(memoryStores.syncQueue.values()).find(
        (q) => q.entityId === item.entityId && (q.status === 'PENDING' || q.status === 'SYNCING')
      );
      if (existingMem && existingMem.operationType === item.operationType) {
        existingMem.payload = item.payload;
        existingMem.updatedAt = new Date().toISOString();
        existingMem.status = 'PENDING';
      } else {
        memoryStores.syncQueue.set(item.id, item);
      }

      const db = await getIndexedDB();
      if (!db) return;

      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const index = store.index('by_entityId');
      const existingForEntity = await index.getAll(item.entityId);

      const pendingForEntity = existingForEntity.find((q) => q.status === 'PENDING' || q.status === 'SYNCING');
      if (pendingForEntity && pendingForEntity.operationType === item.operationType) {
        pendingForEntity.payload = item.payload;
        pendingForEntity.updatedAt = new Date().toISOString();
        pendingForEntity.status = 'PENDING';
        await store.put(pendingForEntity);
        await tx.done;
        return;
      }

      await store.put(item);
      await tx.done;
    } catch {
      // Memory queue already has the item
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
      for (const [key, val] of memoryStores.syncQueue.entries()) {
        if (val.status === 'SYNCED') {
          memoryStores.syncQueue.delete(key);
        }
      }
      const db = await getIndexedDB();
      if (!db) return;
      const tx = db.transaction('syncQueue', 'readwrite');
      const store = tx.objectStore('syncQueue');
      const index = store.index('by_status');
      const syncedKeys = await index.getAllKeys('SYNCED');
      for (const key of syncedKeys) {
        await store.delete(key);
      }
      await tx.done;
    } catch {
      // Ignored
    }
  }
}

export const indexedDBService = new IndexedDBService();
