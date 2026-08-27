import React from 'react';
import { ComplianceStatus } from '../../types/metrology';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  status: ComplianceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ComplianceBadge: React.FC<Props> = ({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm font-bold gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  switch (status) {
    case 'PASS':
      return (
        <span
          id={`badge-compliance-pass-${Math.random().toString(36).substr(2, 4)}`}
          className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs ${sizeClasses[size]} ${className}`}
        >
          <CheckCircle2 size={iconSizes[size]} className="text-emerald-600 shrink-0" />
          {showLabel && <span>PASS</span>}
        </span>
      );

    case 'FAIL':
      return (
        <span
          id={`badge-compliance-fail-${Math.random().toString(36).substr(2, 4)}`}
          className={`inline-flex items-center rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs ${sizeClasses[size]} ${className}`}
        >
          <XCircle size={iconSizes[size]} className="text-rose-600 shrink-0" />
          {showLabel && <span>FAIL</span>}
        </span>
      );

    case 'NOT_EVALUATED':
    default:
      return (
        <span
          id={`badge-compliance-not-eval-${Math.random().toString(36).substr(2, 4)}`}
          className={`inline-flex items-center rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs ${sizeClasses[size]} ${className}`}
        >
          <AlertCircle size={iconSizes[size]} className="text-amber-600 shrink-0" />
          {showLabel && <span>NOT EVALUATED</span>}
        </span>
      );
  }
};
