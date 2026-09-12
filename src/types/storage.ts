export type SyncOperationType = 'CREATE' | 'UPDATE' | 'DELETE';

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type EntityType =
  | 'INSTRUMENT'
  | 'TEST_SESSION'
  | 'REPORT'
  | 'EQUIPMENT'
  | 'ATTACHMENT'
  | 'AUDIT_LOG'
  | 'LABORATORY'
  | 'USER';

export interface SyncQueueItem<T = any> {
  id: string; // UUID of queue entry
  entityType: EntityType;
  entityId: string; // stable UUID / ID of domain entity
  operationType: SyncOperationType;
  payload: T;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: SyncStatus;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  deviceId: string;
}

export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'SYNC_ERROR' | 'SCHEMA_PENDING' | 'PERMISSION_PENDING';

export interface StorageStatusState {
  networkStatus: NetworkStatus;
  isOnline: boolean;
  isCloudConnected: boolean;
  isSupabaseConfigured: boolean;
  isSchemaMissing?: boolean;
  isPermissionDenied?: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface AppMetadata {
  key: string;
  value: any;
  updatedAt: string;
}
