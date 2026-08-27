import React, { useState } from 'react';
import { TestSession, TestSessionStatus } from '../../types/testSession';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import {
  ClipboardCheck,
  Search,
  Filter,
  Plus,
  Play,
  CheckCircle2,
  FileText,
  ArrowRight,
  Clock,
  Send,
  UserCheck,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { EmptyState } from '../common/EmptyState';

interface Props {
  onSelectTestSession: (id: string) => void;
  onOpenNewTestModal: () => void;
  onSelectReport: (reportId: string) => void;
}

export const TestSessionList: React.FC<Props> = ({
  onSelectTestSession,
  onOpenNewTestModal,
  onSelectReport,
}) => {
  const { canRecordObservations } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const testSessions = db.getTestSessions();

  const filtered = testSessions.filter((s) => {
    const matchesSearch =
      s.testSessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.instrumentSnapshot.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.instrumentSnapshot.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.instrumentSnapshot.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.technicianName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div id="test-session-list-view" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck size={22} className="text-indigo-600 shrink-0" />
            <span>NAWI Verification Test Sessions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Physical laboratory test observation sessions and legal compliance records
          </p>
        </div>

        {canRecordObservations && (
          <button
            id="btn-create-test-session"
            onClick={onOpenNewTestModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus size={16} />
            Start New Test Session
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search test number, instrument, technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-slate-400 shrink-0 hidden sm:inline" />
          <span className="text-xs text-slate-500 font-medium shrink-0">Status:</span>
          {['ALL', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REPORT_GENERATED'].map((st) => (
            <button
              key={st}
              id={`filter-session-status-${st.toLowerCase()}`}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Sessions' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Test Sessions Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No test sessions found"
          description="There are no test sessions matching your current filter. You can start a new verification test session."
          actionLabel={canRecordObservations ? 'Start Test Session' : undefined}
          onAction={onOpenNewTestModal}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-5">Session #</th>
                  <th className="p-3.5">Instrument Under Test</th>
                  <th className="p-3.5">Verification Type</th>
                  <th className="p-3.5">Stage & Status</th>
                  <th className="p-3.5">Compliance</th>
                  <th className="p-3.5">Technician / Date</th>
                  <th className="p-3.5 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => onSelectTestSession(s.id)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5 pl-5 font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {s.testSessionNumber}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">
                        {s.instrumentSnapshot.manufacturer} {s.instrumentSnapshot.model}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SN: {s.instrumentSnapshot.serialNumber} (Max {s.instrumentSnapshot.maxCapacity} {s.instrumentSnapshot.unit})
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-medium text-slate-700 font-mono text-[11px]">
                        {s.standardEdition}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <StatusBadge status={s.status} size="sm" />
                    </td>

                    <td className="p-3.5">
                      <ComplianceBadge status={s.overallCompliance} size="sm" />
                    </td>

                    <td className="p-3.5 text-slate-500">
                      <div className="font-medium text-slate-800">{s.technicianName}</div>
                      <div className="text-[11px] text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</div>
                    </td>

                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTestSession(s.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-semibold rounded-md transition-colors"
                      >
                        <span>Open Session</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
