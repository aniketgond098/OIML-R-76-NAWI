import React from 'react';
import {
  LayoutDashboard,
  Scale,
  ClipboardCheck,
  FileText,
  BookOpen,
  Wrench,
  History,
  CheckSquare,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../../services/auth/authContext';

export type MainNavTab =
  | 'dashboard'
  | 'instruments'
  | 'testSessions'
  | 'reports'
  | 'standards'
  | 'equipment'
  | 'audit'
  | 'qa';

interface Props {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser } = useAuth();

  const navItems: { id: MainNavTab; label: string; icon: React.FC<{ size: number; className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'instruments', label: 'Instruments', icon: Scale },
    { id: 'testSessions', label: 'Test Sessions', icon: ClipboardCheck },
    { id: 'reports', label: 'Reports Archive', icon: FileText },
    { id: 'standards', label: 'Standards & Rules', icon: BookOpen },
    { id: 'equipment', label: 'Equipment & Weights', icon: Wrench },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'qa', label: 'Metrology QA Suite', icon: CheckSquare, badge: 'OIML' },
  ];

  const handleItemClick = (id: MainNavTab) => {
    onTabChange(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full w-full select-none">
      {/* Mobile Drawer Header */}
      <div className="p-4 flex md:hidden items-center justify-between border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            <Scale size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white leading-tight">NAWI Metrology</div>
            <div className="text-[10px] text-slate-400">OIML R 76-1:2006</div>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-4 pt-5 space-y-6 overflow-y-auto flex-1 min-h-0">
        {/* Navigation Group */}
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 block mb-2.5">
            Main Navigation
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all min-h-[44px] md:min-h-[38px] ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Metrological Authority Notice */}
        <div className="p-3 bg-slate-800/70 border border-slate-700/80 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <ShieldAlert size={14} className="text-amber-400" />
            <span>Standard Version</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Operating under <strong className="text-slate-200">OIML R 76-1:2006</strong> ruleset. All MPE calculations are traceable.
          </p>
        </div>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <p className="font-semibold text-slate-200 truncate">{currentUser.fullName}</p>
          <p className="text-[10px] text-slate-500 truncate">{currentUser.designation}</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="System Online & Verified" />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent docked on md and above) */}
      <aside
        id="main-sidebar"
        className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shrink-0 h-full self-stretch select-none border-r border-slate-800 overflow-hidden"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer (Visible on small screens when toggled) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />

          {/* Drawer Canvas */}
          <aside
            id="mobile-sidebar-drawer"
            className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-full z-50 shadow-2xl animate-in slide-in-from-left duration-200"
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
