import React, { useState } from 'react';
import { db } from '../../services/storage/database';
import { History, Search, ShieldCheck, User, Code, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditLogEntry } from '../../types/audit';

export const AuditLogView: React.FC = () => {
  const auditLogs = db.getAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entityName && log.entityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const actionBadges: Record<string, string> = {
    INSTRUMENT_CREATED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    INSTRUMENT_UPDATED: 'bg-blue-50 text-blue-800 border-blue-200',
    TEST_SESSION_CREATED: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    OBSERVATION_RECORDED: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    OBSERVATION_MODIFIED: 'bg-amber-50 text-amber-800 border-amber-200',
    TEST_SUBMITTED_FOR_REVIEW: 'bg-purple-50 text-purple-800 border-purple-200',
    TEST_APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    TEST_REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
    REPORT_GENERATED: 'bg-teal-50 text-teal-800 border-teal-200',
    USER_LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div id="audit-trail-view" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History size={22} className="text-indigo-600" />
            Append-Only Metrological Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all user actions, observation changes, approvals, and report generations
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search actor, entity, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium shrink-0">Action:</span>
          {['ALL', 'INSTRUMENT_CREATED', 'TEST_SESSION_CREATED', 'OBSERVATION_RECORDED', 'TEST_SUBMITTED_FOR_REVIEW', 'TEST_APPROVED', 'REPORT_GENERATED'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors shrink-0 ${
                actionFilter === act
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity & Details</th>
                <th className="p-3.5 pr-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 pl-5 font-mono text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.actorRole}</div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            actionBadges[log.action] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-800">
                        <div className="font-semibold">{log.description}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {log.entityType} • {log.entityId} {log.entityName ? `(${log.entityName})` : ''}
                        </div>
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <button className="text-slate-400 hover:text-slate-700 p-1">
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable JSON details */}
                    {isExpanded && (
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={5} className="p-4 pl-5">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                            Audit Record State & Cryptographic Metadata
                          </span>
                          <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48 bg-slate-950 p-3 rounded-md">
                            {JSON.stringify(
                              {
                                id: log.id,
                                timestamp: log.timestamp,
                                actorId: log.actorId,
                                actorName: log.actorName,
                                actorRole: log.actorRole,
                                action: log.action,
                                entityType: log.entityType,
                                entityId: log.entityId,
                                entityName: log.entityName,
                                description: log.description,
                                oldValue: log.oldValue ? JSON.parse(log.oldValue) : undefined,
                                newValue: log.newValue ? JSON.parse(log.newValue) : undefined,
                                reason: log.reason,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
