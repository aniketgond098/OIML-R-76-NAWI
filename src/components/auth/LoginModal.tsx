import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../services/auth/authContext';
import { Key, ShieldCheck, User } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { availableUsers, switchUser, login } = useAuth();
  const [email, setEmail] = useState('rajesh.k@metrology.gov.in');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(email);
    if (success) {
      onClose();
    } else {
      setError('User not found with this email address.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Laboratory Personnel Authentication"
      subtitle="Sign in or switch active test operator / reviewer credentials"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-slate-700 font-bold block mb-1">Select Active User Profile</label>
            <select
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              {availableUsers.map((u) => (
                <option key={u.id} value={u.email}>
                  {u.fullName} — {u.designation} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">RBAC Permission Capabilities:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li><strong>Technician:</strong> Record observations, turning points, and submit for review.</li>
              <li><strong>Legal Reviewer:</strong> Audit math traces, sign off, and seal SHA-256 reports.</li>
              <li><strong>Admin / Director:</strong> Full jurisdictional and rule registry authority.</li>
            </ul>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              Authenticate Session
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
