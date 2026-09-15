import React from 'react';
import { WeighWiseLogo } from './WeighWiseLogo';
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

  const operationsNav: { id: MainNavTab; label: string; icon: React.FC<{ size: number; className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'instruments', label: 'Instrument Registry', icon: Scale },
    { id: 'testSessions', label: 'Test Sessions', icon: ClipboardCheck },
    { id: 'reports', label: 'Reports Archive', icon: FileText },
  ];

  const complianceNav: { id: MainNavTab; label: string; icon: React.FC<{ size: number; className?: string }>; badge?: string }[] = [
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

  const renderNavGroup = (title: string, items: typeof operationsNav) => (
    <div className="space-y-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block mb-1.5 font-mono">
        {title}
      </span>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-[40px] md:min-h-[36px] group relative ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={16}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    isActive
                      ? 'bg-indigo-700 text-indigo-100'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
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
  );

  const navContent = (
    <div className="flex flex-col h-full w-full select-none">
      {/* Mobile Drawer Header */}
      <div className="p-4 flex md:hidden items-center justify-between border-b border-slate-800 bg-slate-950/80">
        <WeighWiseLogo variant="horizontal" theme="light" size="sm" showSubtitle={true} />
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

      <div className="p-3.5 pt-4 space-y-5 overflow-y-auto flex-1 min-h-0">
        {/* Desktop Mini Brand Card */}
        <div className="hidden md:flex items-center gap-2.5 px-3 py-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
          <WeighWiseLogo variant="icon" theme="light" size={24} />
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-white tracking-wide block uppercase font-mono">
              WeighWise Metrology
            </span>
            <span className="text-[9px] text-teal-400 font-semibold block font-mono">
              OIML R 76-1:2006 (E)
            </span>
          </div>
        </div>

        {/* Navigation Groups */}
        {renderNavGroup('Testing Operations', operationsNav)}
        {renderNavGroup('Compliance & Metrology', complianceNav)}

        {/* Metrological Authority Notice */}
        <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-teal-400 shrink-0" />
              <span className="text-[11px]">Traceability Standard</span>
            </div>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              R 76-1:2006
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            All MPE and verification scale calculations follow OIML Table 3/4 tolerances.
          </p>
        </div>
      </div>

      {/* Footer User Info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 text-xs flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <p className="font-semibold text-slate-200 text-xs truncate">{currentUser.fullName}</p>
          <p className="text-[10px] text-slate-400 truncate">{currentUser.designation}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" title="System Online & Verified">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-400 font-mono">Ready</span>
        </div>
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
