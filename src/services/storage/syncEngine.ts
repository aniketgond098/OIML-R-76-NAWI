import { indexedDBService } from './indexedDB';
import { supabaseService, isSupabaseConfigured } from './supabase';
import { SyncQueueItem, StorageStatusState, NetworkStatus } from '../../types/storage';
import { Laboratory, UserProfile } from '../../types/user';

type StatusListener = (status: StorageStatusState) => void;

class SyncEngine {
  private listeners: Set<StatusListener> = new Set();
  private isProcessing = false;
  private syncTimer: any = null;
  private pingTimer: any = null;
  private deviceId: string = '';

  private currentStatus: StorageStatusState = {
    networkStatus: 'ONLINE',
    isOnline: typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true,
    isCloudConnected: false,
    isSupabaseConfigured: isSupabaseConfigured(),
    isSyncing: false,
    pendingCount: 0,
    lastSyncedAt: undefined,
    lastError: undefined,
  };

  constructor() {
    this.initDeviceId();
    this.setupNetworkListeners();
    this.startPeriodicTasks();
  }

  private async initDeviceId() {
    try {
      let id = await indexedDBService.getMetadata<string>('device_id');
      if (!id) {
        id = `DEV-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        await indexedDBService.setMetadata('device_id', id);
      }
      this.deviceId = id;
    } catch (e) {
      this.deviceId = `DEV-${Date.now()}`;
    }
  }

  public getDeviceId(): string {
    return this.deviceId || 'DEV-DEFAULT';
  }

  private setupNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SyncEngine] Browser reported online');
      this.checkConnectivityAndSync();
    });

    window.addEventListener('offline', () => {
      console.log('[SyncEngine] Browser reported offline');
      this.updateStatus({
        isOnline: false,
        networkStatus: 'OFFLINE',
      });
    });
  }

  private startPeriodicTasks() {
    // Check queue periodically every 25 seconds
    this.syncTimer = setInterval(() => {
      if (
        this.currentStatus.isOnline &&
        !this.currentStatus.isSchemaMissing &&
        !this.currentStatus.isPermissionDenied &&
        !this.isProcessing
      ) {
        this.processQueue();
      }
    }, 25000);

    // Heartbeat check every 60 seconds
    this.pingTimer = setInterval(() => {
      this.checkConnectivity();
    }, 60000);

    // Initial check
    setTimeout(() => {
      this.checkConnectivityAndSync();
    }, 1000);
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): StorageStatusState {
    return { ...this.currentStatus };
  }

  private updateStatus(partial: Partial<StorageStatusState>) {
    this.currentStatus = {
      ...this.currentStatus,
      ...partial,
      isSupabaseConfigured: isSupabaseConfigured(),
    };
    this.listeners.forEach((listener) => {
      try {
        listener(this.getStatus());
      } catch (e) {
        console.error('[SyncEngine] Error in status listener:', e);
      }
    });
  }

  public async checkConnectivity(): Promise<boolean> {
    const navOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
    if (!navOnline) {
      this.updateStatus({
        isOnline: false,
        isCloudConnected: false,
        networkStatus: 'OFFLINE',
      });
      return false;
    }

    if (!isSupabaseConfigured()) {
      // Supabase is not configured yet. The local IndexedDB is the authoritative active store.
      // We report ONLINE for local capability, with zero cloud errors.
      const pendingItems = await indexedDBService.getPendingQueue();
      this.updateStatus({
        isOnline: true,
        isCloudConnected: false,
        isSchemaMissing: false,
        networkStatus: 'ONLINE',
        pendingCount: pendingItems.length,
        lastError: undefined,
      });
      return true;
    }

    const health = await supabaseService.checkDatabaseHealth();
    const pendingItems = await indexedDBService.getPendingQueue();

    if (!health.reachable) {
      this.updateStatus({
        isOnline: true,
        isCloudConnected: false,
        isSchemaMissing: false,
        networkStatus: pendingItems.length > 0 ? 'SYNC_ERROR' : 'ONLINE',
        pendingCount: pendingItems.length,
        lastError: health.error || 'Cloud database connection unavailable. Local IndexedDB is active and saving all changes.',
      });
      return false;
    }

    if (health.isPermissionDenied) {
      this.updateStatus({
        isOnline: true,
        isCloudConnected: false,
        isSchemaMissing: false,
        isPermissionDenied: true,
        networkStatus: 'PERMISSION_PENDING',
        pendingCount: pendingItems.length,
        lastError: 'PostgreSQL permission denied (42501). Table access grants needed for anon role. Run GRANT SQL in Supabase SQL editor.',
      });
      return false;
    }

    if (!health.tablesReady || health.isSchemaMissing) {
      this.updateStatus({
        isOnline: true,
        isCloudConnected: false,
        isSchemaMissing: true,
        isPermissionDenied: false,
        networkStatus: 'SCHEMA_PENDING',
        pendingCount: pendingItems.length,
        lastError: 'Database tables not found in schema cache (PGRST205). Run /supabase/schema.sql in your Supabase SQL editor.',
      });
      return false;
    }

    this.updateStatus({
      isOnline: true,
      isCloudConnected: true,
      isSchemaMissing: false,
      isPermissionDenied: false,
      networkStatus: this.currentStatus.isSyncing ? 'SYNCING' : (this.currentStatus.lastError ? 'SYNC_ERROR' : 'ONLINE'),
      pendingCount: pendingItems.length,
      lastError: undefined,
    });
    return true;
  }

  public async checkConnectivityAndSync(): Promise<void> {
    const isConn = await this.checkConnectivity();
    if (isConn) {
      await this.processQueue();
    }
  }

  public async triggerSync(): Promise<void> {
    const pendingItems = await indexedDBService.getPendingQueue();
    this.updateStatus({ pendingCount: pendingItems.length, isSchemaMissing: false, isPermissionDenied: false });
    // Reset schema missing flag to retry on manual user trigger
    if (this.currentStatus.isOnline) {
      const isConn = await this.checkConnectivity();
      if (isConn) {
        await this.processQueue();
      }
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const pending = await indexedDBService.getPendingQueue();
    this.updateStatus({ pendingCount: pending.length });

    if (pending.length === 0) {
      if (
        this.currentStatus.networkStatus !== 'OFFLINE' &&
        this.currentStatus.networkStatus !== 'SCHEMA_PENDING' &&
        this.currentStatus.networkStatus !== 'PERMISSION_PENDING'
      ) {
        this.updateStatus({
          networkStatus: 'ONLINE',
          isSyncing: false,
          lastError: undefined,
        });
      }
      return;
    }

    if (!isSupabaseConfigured()) {
      // If cloud is unconfigured, items remain safely buffered in IndexedDB without errors.
      return;
    }

    if (this.currentStatus.isSchemaMissing || this.currentStatus.isPermissionDenied) {
      // Database tables or permissions haven't been configured yet in Supabase. Keep items preserved safely in IndexedDB.
      return;
    }

    this.isProcessing = true;
    this.updateStatus({
      isSyncing: true,
      networkStatus: 'SYNCING',
    });

    // Ensure baseline laboratories and users are provisioned in Supabase first to satisfy foreign keys
    try {
      const labs = await indexedDBService.getAll<Laboratory>('laboratories');
      for (const lab of labs) {
        await supabaseService.upsertLaboratory(lab);
      }
      const users = await indexedDBService.getAll<UserProfile>('users');
      for (const user of users) {
        await supabaseService.upsertUser(user);
      }
    } catch (baselineErr) {
      console.warn('[SyncEngine] Baseline sync notice:', baselineErr);
    }

    let syncErrors = 0;
    let lastErrorMsg = '';

    for (const item of pending) {
      // If internet disconnected during batch, halt gracefully
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[SyncEngine] Network lost during batch sync; keeping remaining items in IndexedDB queue');
        this.updateStatus({ isOnline: false, networkStatus: 'OFFLINE' });
        break;
      }

      item.status = 'SYNCING';
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastAttemptAt = new Date().toISOString();
      await indexedDBService.updateQueueItem(item);

      let opResult: { success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean } = { success: false };

      try {
        switch (item.entityType) {
          case 'INSTRUMENT':
            opResult = await supabaseService.upsertInstrument(item.payload);
            break;
          case 'TEST_SESSION':
            opResult = await supabaseService.upsertTestSession(item.payload);
            break;
          case 'REPORT':
            opResult = await supabaseService.upsertReport(item.payload);
            break;
          case 'EQUIPMENT':
            opResult = await supabaseService.upsertEquipment(item.payload);
            break;
          case 'LABORATORY':
            opResult = await supabaseService.upsertLaboratory(item.payload);
            break;
          case 'USER':
            opResult = await supabaseService.upsertUser(item.payload);
            break;
          case 'AUDIT_LOG':
            opResult = await supabaseService.upsertAuditLog(item.payload);
            break;
          case 'ATTACHMENT':
            opResult = await supabaseService.uploadAttachment(item.payload, item.payload.dataUrl);
            break;
          default:
            opResult = { success: true };
        }
      } catch (err: any) {
        opResult = { success: false, error: err.message || String(err) };
      }

      if (opResult.success) {
        // Idempotently remove from queue store
        await indexedDBService.removeQueueItem(item.id);
      } else {
        syncErrors++;
        lastErrorMsg = opResult.error || 'Unknown sync error';
        item.status = 'FAILED';
        item.lastError = lastErrorMsg;
        await indexedDBService.updateQueueItem(item);

        if (opResult.isPermissionDenied) {
          // PostgreSQL Error 42501! Stop processing batch immediately
          this.updateStatus({
            isPermissionDenied: true,
            isSchemaMissing: false,
            isCloudConnected: false,
            networkStatus: 'PERMISSION_PENDING',
            lastError: 'PostgreSQL permission denied (42501). Table access grants needed for anon role. Run GRANT SQL in Supabase SQL editor.',
          });
          break;
        }

        if (opResult.isSchemaMissing) {
          // Table doesn't exist yet in Supabase! Stop processing batch immediately
          this.updateStatus({
            isSchemaMissing: true,
            isPermissionDenied: false,
            isCloudConnected: false,
            networkStatus: 'SCHEMA_PENDING',
            lastError: 'Database tables not created yet in Supabase (PGRST205). Run schema.sql in Supabase SQL editor.',
          });
          break;
        }

        // If it's a network disconnection error, stop processing rest of queue
        if (lastErrorMsg.includes('Failed to fetch') || lastErrorMsg.includes('NetworkError')) {
          this.updateStatus({ isOnline: false, networkStatus: 'OFFLINE' });
          break;
        }
      }
    }

    const remainingPending = await indexedDBService.getPendingQueue();
    this.isProcessing = false;

    if (this.currentStatus.isPermissionDenied) {
      this.updateStatus({
        isSyncing: false,
        networkStatus: 'PERMISSION_PENDING',
        pendingCount: remainingPending.length,
      });
    } else if (this.currentStatus.isSchemaMissing) {
      this.updateStatus({
        isSyncing: false,
        networkStatus: 'SCHEMA_PENDING',
        pendingCount: remainingPending.length,
      });
    } else if (syncErrors > 0) {
      this.updateStatus({
        isSyncing: false,
        networkStatus: this.currentStatus.isOnline ? 'SYNC_ERROR' : 'OFFLINE',
        pendingCount: remainingPending.length,
        lastError: lastErrorMsg,
      });
    } else {
      this.updateStatus({
        isSyncing: false,
        networkStatus: 'ONLINE',
        pendingCount: remainingPending.length,
        lastSyncedAt: new Date().toISOString(),
        lastError: undefined,
      });
    }
  }
}

export const syncEngine = new SyncEngine();
