import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage/storageService';
import { StorageStatusState } from '../../types/storage';
import { WifiOff, Wifi, X, ShieldCheck } from 'lucide-react';

export const NetworkBanner: React.FC = () => {
  const [status, setStatus] = useState<StorageStatusState>(() => storageService.getSyncStatus());
  const [bannerType, setBannerType] = useState<'OFFLINE' | 'RESTORED' | null>(null);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    // Native window listeners for physical connectivity drops
    const handleOffline = () => {
      setBannerType('OFFLINE');
      setDismissedOffline(false);
    };

    const handleOnline = () => {
      setBannerType('RESTORED');
      const timer = setTimeout(() => {
        setBannerType(null);
      }, 4500);
      return () => clearTimeout(timer);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    let prevOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;

    const unsubscribe = storageService.subscribeSyncStatus((newStatus) => {
      // If browser is actually online, never display offline banner
      const browserOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
      if (browserOnline && !newStatus.isOnline) {
        // If internal state says offline but browser is online, sync engine was paused, not device offline
        return;
      }

      if (prevOnline && !newStatus.isOnline) {
        setBannerType('OFFLINE');
        setDismissedOffline(false);
      } else if (!prevOnline && newStatus.isOnline) {
        setBannerType('RESTORED');
        const timer = setTimeout(() => {
          setBannerType(null);
        }, 4500);
        return () => clearTimeout(timer);
      }
      prevOnline = newStatus.isOnline;
      setStatus(newStatus);
    });

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
      unsubscribe();
    };
  }, []);

  // Safeguard: Do not display offline banner if navigator reports online
  const isActuallyOffline = typeof navigator !== 'undefined' ? navigator.onLine === false : false;

  if (bannerType === 'OFFLINE' && isActuallyOffline && !dismissedOffline) {
    return (
      <div
        id="offline-banner"
        className="bg-amber-500 text-slate-950 px-4 py-2.5 flex items-center justify-between text-xs font-semibold shadow-xs transition-all animate-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-center gap-2 max-w-4xl">
          <WifiOff size={16} className="shrink-0 text-slate-900" />
          <span>
            <strong>Connection lost:</strong> You are offline. Your verification data and test observations are being
            safely saved in local IndexedDB and will synchronize with Supabase automatically when your connection returns.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-amber-600/30 px-2 py-0.5 rounded text-slate-950">
            <ShieldCheck size={12} /> Local Safety Active
          </span>
          <button
            onClick={() => setDismissedOffline(true)}
            className="text-slate-900 hover:text-black p-1 rounded hover:bg-amber-600/20"
            title="Dismiss notice"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  if (bannerType === 'RESTORED') {
    return (
      <div
        id="restored-banner"
        className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-xs transition-all animate-in slide-in-from-top-2 duration-200"
      >
        <div className="flex items-center gap-2">
          <Wifi size={16} className="shrink-0" />
          <span>
            <strong>Connection restored:</strong> All local test observations and changes have been preserved and are
            synchronizing with the Supabase cloud database.
          </span>
        </div>
        <button
          onClick={() => setBannerType(null)}
          className="text-white/80 hover:text-white p-1 rounded hover:bg-emerald-700/50"
          title="Dismiss notice"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return null;
};
