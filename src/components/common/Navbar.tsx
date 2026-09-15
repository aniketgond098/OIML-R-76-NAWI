import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { db } from '../../services/storage/database';
import { SyncStatusBadge } from './SyncStatusBadge';
import {
  Scale,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
  Key,
  Menu,
  X,
  ExternalLink,
  BookOpen,
  QrCode,
} from 'lucide-react';
import { UserRole } from '../../types/user';

interface Props {
  onOpenLoginModal: () => void;
  onOpenScanModal?: () => void;
  isMobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<Props> = ({
  onOpenLoginModal,
  onOpenScanModal,
  isMobileSidebarOpen = false,
  onToggleMobileSidebar,
}) => {
  const { currentUser, switchRole } = useAuth();
  const lab = db.getLaboratory('LAB-IND-001');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
    LAB_TECHNICIAN: 'bg-blue-100 text-blue-800 border-blue-200',
    REVIEWER_OFFICER: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Director / Admin',
    LAB_TECHNICIAN: 'Testing Technician',
    REVIEWER_OFFICER: 'Legal Reviewer',
  };

  return (
    <header
      id="main-navbar"
      className="w-full shrink-0 h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between z-30 shadow-2xs"
    >
      {/* Brand & Metrology Title + Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleMobileSidebar && (
          <button
            id="mobile-nav-toggle-btn"
            onClick={onToggleMobileSidebar}
            aria-label={isMobileSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center shadow-xs shrink-0">
          <Scale size={20} className="text-indigo-200" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none tracking-tight truncate">
              NAWI Test Report
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-md">
            <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{lab?.name}</span>
          </p>
        </div>
      </div>

      {/* Role Switcher, Official Rules Button & User Profile Controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Cloud & Local Storage Sync Status Badge */}
        <SyncStatusBadge />

        {/* Global QR Code Scanner Button */}
        {onOpenScanModal && (
          <button
            id="navbar-scan-qr-btn"
            onClick={onOpenScanModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 shadow-2xs transition-colors"
            title="Scan physical QR code sticker to verify instrument"
          >
            <QrCode size={14} className="text-indigo-600" />
            <span className="hidden sm:inline">Scan QR</span>
          </button>
        )}

        {/* The Single Official OIML R-76 Rules Button */}
        <a
          id="navbar-official-rules-btn"
          href="https://www.oiml.org/en/publications/recommendations/en/files/pdf_r/r076-1-e06.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 text-slate-700 hover:text-indigo-700 text-xs font-semibold border border-slate-200 hover:border-indigo-200 transition-all"
          title="Open official OIML R 76-1:2006 (E) standard publication directly from OIML"
        >
          <BookOpen size={14} className="text-indigo-600" />
          <span className="hidden sm:inline">Official R-76 Rules</span>
          <ExternalLink size={11} className="text-slate-400" />
        </a>

        {/* User Account Dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 sm:pl-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="text-left hidden md:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[120px] lg:max-w-[140px]">
                {currentUser.fullName}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleColors[currentUser.role]}`}
              >
                {roleLabels[currentUser.role]}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div
              id="user-dropdown-menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{currentUser.designation}</p>
                <div className="mt-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleColors[currentUser.role]}`}>
                    {roleLabels[currentUser.role]}
                  </span>
                </div>
              </div>

              {/* Consolidated Role Switcher in dropdown */}
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Select Active Role
                </span>
                <div className="grid grid-cols-1 gap-1">
                  {(['LAB_TECHNICIAN', 'REVIEWER_OFFICER', 'ADMIN'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      id={`switch-role-${r.toLowerCase()}`}
                      onClick={() => {
                        switchRole(r);
                        setShowUserMenu(false);
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        currentUser.role === r
                          ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200/80'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{roleLabels[r]}</span>
                      {currentUser.role === r && <CheckCircle2 size={13} className="text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* User Menu Actions */}
              <div className="border-t border-slate-100 px-2 py-1.5 space-y-1">
                <button
                  id="navbar-open-auth-btn"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenLoginModal();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 font-medium"
                >
                  <Key size={13} className="text-slate-400" />
                  <span>Sign In with Credentials</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
