import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../../services/storage/storageService';
import { StorageStatusState } from '../../types/storage';
import { SUPABASE_SCHEMA_SQL, SUPABASE_FIX_PERMISSIONS_SQL } from '../../services/storage/schemaSql';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Database,
  ChevronDown,
  X,
  Copy,
  Check,
  Code2,
  ShieldAlert,
} from 'lucide-react';

export const SyncStatusBadge: React.FC = () => {
  const [status, setStatus] = useState<StorageStatusState>(() => storageService.getSyncStatus());
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedPermissions, setCopiedPermissions] = useState(false);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = storageService.subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  // Handle click outside and Escape key to close popover
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Check if clicked element is inside container or inside popover
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 10);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    setIsRetrying(true);
    try {
      await storageService.retrySync();
    } catch (e) {
      console.warn('[SyncStatusBadge] Sync failed:', e);
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  const handleCopySchemaSql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2500);
    } catch (err) {
      console.error('Failed to copy SQL to clipboard:', err);
    }
  };

  const handleCopyPermissionsSql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_FIX_PERMISSIONS_SQL);
      setCopiedPermissions(true);
      setTimeout(() => setCopiedPermissions(false), 2500);
    } catch (err) {
      console.error('Failed to copy Permissions SQL to clipboard:', err);
    }
  };

  const getBadgeConfig = () => {
    if (!status.isOnline || status.networkStatus === 'OFFLINE') {
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
        dot: 'bg-rose-500',
        icon: CloudOff,
        text: 'Offline — Saved locally',
        pulse: false,
      };
    }
    if (status.isSyncing || status.networkStatus === 'SYNCING') {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
        dot: 'bg-amber-500',
        icon: RefreshCw,
        text: status.pendingCount > 0 ? `Syncing (${status.pendingCount})...` : 'Syncing...',
        pulse: true,
      };
    }
    if (status.isPermissionDenied || status.networkStatus === 'PERMISSION_PENDING') {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
        dot: 'bg-amber-500',
        icon: ShieldAlert,
        text: 'Permission Required (Local Safe)',
        pulse: false,
      };
    }
    if (status.isSchemaMissing || status.networkStatus === 'SCHEMA_PENDING') {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
        dot: 'bg-amber-500',
        icon: Database,
        text: 'Schema Pending (Local Safe)',
        pulse: false,
      };
    }
    if (status.isSupabaseConfigured && !status.isCloudConnected) {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
        dot: 'bg-amber-500',
        icon: AlertTriangle,
        text: status.pendingCount > 0 ? `Cloud Paused (${status.pendingCount} queued)` : 'Cloud Paused (IndexedDB Safe)',
        pulse: false,
      };
    }
    if (status.networkStatus === 'SYNC_ERROR') {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
        dot: 'bg-amber-600',
        icon: AlertTriangle,
        text: status.pendingCount > 0 ? `Sync pending (${status.pendingCount})` : 'Sync Error',
        pulse: false,
      };
    }
    if (status.pendingCount > 0) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
        dot: 'bg-amber-500',
        icon: RefreshCw,
        text: `${status.pendingCount} to sync`,
        pulse: false,
      };
    }
    return {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
      text: status.isSupabaseConfigured ? 'Connected & Synced' : 'IndexedDB Active (Safe)',
      pulse: false,
    };
  };

  const badge = getBadgeConfig();
  const Icon = badge.icon;

  return (
    <div ref={containerRef} className="relative">
      <button
        id="sync-status-badge-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="View local & cloud storage status"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${badge.bg}`}
      >
        <span className={`w-2 h-2 rounded-full ${badge.dot} ${badge.pulse ? 'animate-ping' : ''}`} />
        <Icon size={13} className={badge.pulse ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">{badge.text}</span>
        <span className="sm:hidden font-medium">
          {status.isOnline
            ? status.pendingCount > 0
              ? `${status.pendingCount} sync`
              : 'Synced'
            : 'Offline'}
        </span>
        <ChevronDown size={11} className={`opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Mobile & Tablet backdrop for easy touch dismissal */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-2xs"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-hidden="true"
          />

          <div
            id="sync-status-popover"
            className="fixed inset-x-2.5 top-16 sm:inset-x-auto sm:right-3 md:right-6 sm:top-16 sm:w-[380px] md:w-[410px] max-w-[calc(100vw-20px)] sm:max-w-none bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Database size={16} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">Hybrid Storage Architecture</h4>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-1.5 -mr-1 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close sync status"
              >
                <X size={16} />
              </button>
            </div>

          {/* Layer 1: IndexedDB */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive size={13} className="text-emerald-600" />
                Local Layer (IndexedDB)
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                ACTIVE & DURABLE
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              All raw observations, tare values, repeatability runs, and test plans are saved locally immediately.
              Never lost if you close the tab or disconnect.
            </p>
          </div>

          {/* Layer 2: Supabase Cloud */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Cloud size={13} className={status.isOnline ? 'text-indigo-600' : 'text-slate-400'} />
                Cloud Layer (Supabase PostgreSQL)
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  !status.isOnline
                    ? 'bg-slate-200 text-slate-700 border-slate-300'
                    : status.isCloudConnected
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                    : status.isPermissionDenied
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : status.isSchemaMissing
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : status.isSupabaseConfigured
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {!status.isOnline
                  ? 'OFFLINE'
                  : status.isCloudConnected
                  ? 'CONNECTED'
                  : status.isPermissionDenied
                  ? 'GRANT PRIVILEGES NEEDED'
                  : status.isSchemaMissing
                  ? 'SCHEMA SETUP NEEDED'
                  : status.isSupabaseConfigured
                  ? 'CLOUD PAUSED (LOCAL SAFE)'
                  : 'STANDALONE (INDEXEDDB)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {status.isPermissionDenied
                ? 'Tables exist, but PostgreSQL error 42501 requires GRANT access for the anon client role.'
                : status.isSchemaMissing
                ? 'Project connected, but PostgreSQL tables need to be created in Supabase.'
                : status.isSupabaseConfigured
                ? 'Primary relational source of truth with automated background synchronization.'
                : 'Supabase credentials optional. Full application operational with local IndexedDB safety engine.'}
            </p>
          </div>

          {/* Database Setup Helper when Permission is Denied (42501) */}
          {status.isPermissionDenied && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900 leading-tight">PostgreSQL Permission Denied (Code 42501)</h5>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    PostgreSQL reported <code className="bg-amber-100/80 px-1 py-0.2 rounded font-mono">permission denied for table</code>. Your {status.pendingCount} records are completely safe in local IndexedDB. Grant access to the <code className="bg-amber-100/80 px-1 py-0.2 rounded font-mono">anon</code> role to resume syncing.
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 text-[11px] space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900">How to grant table access in 10 seconds:</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Click <strong>Copy Fix Permissions SQL</strong> below.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Go to your <strong>Supabase Dashboard → SQL Editor</strong>.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Paste and click <strong>Run</strong>, then click <strong>Sync Now</strong> below.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleCopyPermissionsSql}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  {copiedPermissions ? <Check size={13} className="text-white" /> : <Copy size={13} />}
                  <span>{copiedPermissions ? 'Copied Grant SQL!' : 'Copy Fix Permissions SQL'}</span>
                </button>
                <button
                  onClick={() => setShowSqlViewer(!showSqlViewer)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs"
                  title="Toggle SQL preview"
                >
                  <Code2 size={13} />
                </button>
              </div>

              {showSqlViewer && (
                <div className="mt-2">
                  <div className="max-h-36 overflow-y-auto overflow-x-auto bg-slate-900 text-slate-200 text-[10px] font-mono p-2.5 rounded-lg border border-slate-700 leading-tight">
                    <pre className="whitespace-pre">{SUPABASE_FIX_PERMISSIONS_SQL}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Database Setup Helper when Schema is Missing */}
          {!status.isPermissionDenied && status.isSchemaMissing && (
            <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900 leading-tight">Database Tables Missing in Supabase</h5>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Supabase is reachable, but table schema cache is missing tables (<code className="bg-amber-100/80 px-1 py-0.2 rounded">instruments</code>, <code className="bg-amber-100/80 px-1 py-0.2 rounded">test_sessions</code>). Local IndexedDB is safely retaining your {status.pendingCount} pending records.
                  </p>
                </div>
              </div>

              <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 text-[11px] space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900">How to create tables in 1 minute:</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Click <strong>Copy Schema SQL</strong> below.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Go to your <strong>Supabase Dashboard → SQL Editor</strong>.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <span>Paste and click <strong>Run</strong>, then click <strong>Sync Now</strong> below.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={handleCopySchemaSql}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  {copiedSchema ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedSchema ? 'Copied SQL to Clipboard!' : 'Copy Schema SQL'}</span>
                </button>
                <button
                  onClick={() => setShowSqlViewer(!showSqlViewer)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium shadow-2xs"
                  title="Toggle SQL code preview"
                >
                  <Code2 size={13} />
                </button>
              </div>

              {showSqlViewer && (
                <div className="mt-2">
                  <div className="max-h-36 overflow-y-auto overflow-x-auto bg-slate-900 text-slate-200 text-[10px] font-mono p-2.5 rounded-lg border border-slate-700 leading-tight">
                    <pre className="whitespace-pre">{SUPABASE_SCHEMA_SQL.slice(0, 800)}...</pre>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Full script available in <code>/supabase/schema.sql</code></p>
                </div>
              )}
            </div>
          )}

          {/* Queue Status & Actions */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Unsynced Queue:</span>
              <span className="font-mono font-bold text-slate-900">
                {status.pendingCount} pending {status.pendingCount === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isRetrying || !status.isOnline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {status.lastSyncedAt && (
            <p className="text-[10px] text-slate-400 text-right">
              Last synced: {new Date(status.lastSyncedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </>
    )}
  </div>
  );
};

