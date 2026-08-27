import React, { useState } from 'react';
import { useAuth } from '../../services/auth/authContext';
import { db } from '../../services/storage/database';
import { Scale, ShieldCheck, UserCheck, ChevronDown, LogOut, CheckCircle2, User, Key } from 'lucide-react';
import { UserRole } from '../../types/user';

interface Props {
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<Props> = ({ onOpenLoginModal }) => {
  const { currentUser, availableUsers, switchUser, switchRole } = useAuth();
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
      className="w-full shrink-0 h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between z-30 shadow-2xs"
    >
      {/* Brand & Metrology Title */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center shadow-xs">
          <Scale size={22} className="text-indigo-200" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 leading-none tracking-tight">
              NAWI Test Report System
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              OIML R 76-1:2006
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate max-w-md">
            <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
            <span className="truncate">{lab?.name} ({lab?.accreditationNumber})</span>
          </p>
        </div>
      </div>

      {/* Role Switcher & User Profile Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Role Tester Pills */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 px-2">Role:</span>
          {(['LAB_TECHNICIAN', 'REVIEWER_OFFICER', 'ADMIN'] as UserRole[]).map((r) => (
            <button
              key={r}
              id={`quick-role-${r.toLowerCase()}`}
              onClick={() => switchRole(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                currentUser.role === r
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {roleLabels[r]}
            </button>
          ))}
        </div>

        {/* User Account Dropdown */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[140px]">
                {currentUser.fullName}
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleColors[currentUser.role]}`}
              >
                {roleLabels[currentUser.role]}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.fullName.charAt(0)}
            </div>
            <ChevronDown size={14} className="text-slate-400" />
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
              </div>

              <div className="px-2 py-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                  Switch Active Lab User
                </span>
                {availableUsers.map((u) => (
                  <button
                    key={u.id}
                    id={`switch-user-${u.id}`}
                    onClick={() => {
                      switchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentUser.id === u.id
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{u.fullName}</div>
                      <div className="text-[10px] text-slate-400">{roleLabels[u.role]}</div>
                    </div>
                    {currentUser.id === u.id && <CheckCircle2 size={14} className="text-indigo-600" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 px-2 pt-1.5">
                <button
                  id="navbar-open-auth-btn"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenLoginModal();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-700 hover:bg-slate-100 font-medium"
                >
                  <Key size={13} className="text-slate-400" />
                  Sign In with Credentials
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
