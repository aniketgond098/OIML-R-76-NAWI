import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types/user';
import { SEED_USERS } from '../storage/seedData';
import { auditService } from '../storage/auditService';

interface AuthContextType {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  canCreateInstrument: boolean;
  canRecordObservations: boolean;
  canSubmitForReview: boolean;
  canApproveTest: boolean;
  canManageRules: boolean;
  canManageEquipment: boolean;
  canViewAuditLogs: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(SEED_USERS[0]); // Default to Technician for active testing

  useEffect(() => {
    try {
      const savedUserId = localStorage.getItem('oiml_nawi_active_user_id');
      if (savedUserId) {
        const found = SEED_USERS.find((u) => u.id === savedUserId);
        if (found) setCurrentUser(found);
      }
    } catch (e) {
      console.warn('Failed to retrieve active user:', e);
    }
  }, []);

  const switchUser = (userId: string) => {
    const target = SEED_USERS.find((u) => u.id === userId);
    if (target) {
      setCurrentUser(target);
      localStorage.setItem('oiml_nawi_active_user_id', target.id);
      auditService.logEvent({
        actorId: target.id,
        actorName: target.fullName,
        actorRole: target.role,
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        entityId: target.id,
        entityName: target.email,
        description: `Session switched to ${target.fullName} (${target.role})`,
      });
    }
  };

  const switchRole = (role: UserRole) => {
    const target = SEED_USERS.find((u) => u.role === role);
    if (target) {
      switchUser(target.id);
    }
  };

  const login = (email: string): boolean => {
    const user = SEED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      switchUser(user.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Default to technician demo session
    switchUser(SEED_USERS[0].id);
  };

  // RBAC Permission Gates
  const role = currentUser.role;
  const canCreateInstrument = role === 'ADMIN' || role === 'LAB_TECHNICIAN';
  const canRecordObservations = role === 'ADMIN' || role === 'LAB_TECHNICIAN';
  const canSubmitForReview = role === 'ADMIN' || role === 'LAB_TECHNICIAN';
  const canApproveTest = role === 'ADMIN' || role === 'REVIEWER_OFFICER';
  const canManageRules = role === 'ADMIN';
  const canManageEquipment = role === 'ADMIN' || role === 'LAB_TECHNICIAN';
  const canViewAuditLogs = true; // All authenticated lab personnel can audit

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        availableUsers: SEED_USERS,
        switchUser,
        switchRole,
        login,
        logout,
        canCreateInstrument,
        canRecordObservations,
        canSubmitForReview,
        canApproveTest,
        canManageRules,
        canManageEquipment,
        canViewAuditLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
