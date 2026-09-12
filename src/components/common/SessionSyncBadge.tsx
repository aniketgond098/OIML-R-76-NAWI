import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage/storageService';
import { StorageStatusState } from '../../types/storage';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, HardDrive } from 'lucide-react';

interface Props {
  sessionId: string;
}

export const SessionSyncBadge: React.FC<Props> = ({ sessionId }) => {
  const [status, setStatus] = useState<StorageStatusState>(() => storageService.getSyncStatus());

  useEffect(() => {
    const unsubscribe = storageService.subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, [sessionId]);

  if (!status.isOnline) {
    return (
      <span
        title="Session saved in local IndexedDB. Will sync when online."
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
      >
        <HardDrive size={11} className="text-amber-600" />
        <span>Locally Protected (Offline)</span>
      </span>
    );
  }

  if (status.isSyncing) {
    return (
      <span
        title="Syncing session changes with Supabase cloud"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shrink-0"
      >
        <RefreshCw size={11} className="text-indigo-600 animate-spin" />
        <span>Cloud Syncing...</span>
      </span>
    );
  }

  if (status.isSchemaMissing) {
    return (
      <span
        title="Session saved in IndexedDB. Supabase database tables pending creation."
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
      >
        <HardDrive size={11} className="text-amber-600" />
        <span>Saved Locally (Schema Pending)</span>
      </span>
    );
  }

  if (status.pendingCount > 0) {
    return (
      <span
        title="Changes saved in IndexedDB and waiting for cloud sync"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
      >
        <HardDrive size={11} className="text-amber-600" />
        <span>Saved Locally ({status.pendingCount} queued)</span>
      </span>
    );
  }

  if (!status.isSupabaseConfigured) {
    return (
      <span
        title="Test session is securely saved in local IndexedDB"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
      >
        <CheckCircle2 size={11} className="text-emerald-600" />
        <span>Saved in IndexedDB (Safe)</span>
      </span>
    );
  }

  if (!status.isCloudConnected) {
    return (
      <span
        title="Test session saved in IndexedDB; cloud sync currently paused"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
      >
        <HardDrive size={11} className="text-amber-600" />
        <span>Saved Locally (Cloud Paused)</span>
      </span>
    );
  }

  return (
    <span
      title="Test session is securely stored in local IndexedDB and verified on Supabase Cloud"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
    >
      <CheckCircle2 size={11} className="text-emerald-600" />
      <span>Cloud Synced</span>
    </span>
  );
};
