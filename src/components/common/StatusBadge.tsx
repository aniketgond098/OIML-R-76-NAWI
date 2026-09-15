import React from 'react';
import { TestSessionStatus } from '../../types/testSession';
import { Clock, FileText, CheckCircle2, XCircle, Send, FileCheck } from 'lucide-react';

interface Props {
  status: TestSessionStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300/80 font-medium ${sizeClasses}`}>
          <FileText size={12} className="text-slate-500 shrink-0" />
          <span>Draft</span>
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium ${sizeClasses}`}>
          <Clock size={12} className="text-blue-500 animate-pulse shrink-0" />
          <span>In Progress</span>
        </span>
      );

    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-medium ${sizeClasses}`}>
          <CheckCircle2 size={12} className="text-teal-600 shrink-0" />
          <span>Completed</span>
        </span>
      );

    case 'UNDER_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium ${sizeClasses}`}>
          <Send size={12} className="text-purple-500 shrink-0" />
          <span>Under Review</span>
        </span>
      );

    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium ${sizeClasses}`}>
          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
          <span>Approved</span>
        </span>
      );

    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium ${sizeClasses}`}>
          <XCircle size={12} className="text-rose-600 shrink-0" />
          <span>Rejected</span>
        </span>
      );

    case 'REPORT_GENERATED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium ${sizeClasses}`}>
          <FileCheck size={12} className="text-indigo-600 shrink-0" />
          <span>Report Sealed</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium ${sizeClasses}`}>
          <span>{status}</span>
        </span>
      );
  }
};
