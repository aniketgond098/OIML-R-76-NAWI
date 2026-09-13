import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { SmartTestPlanItem } from '../../metrology/sequencing/sequencingTypes';

interface Props {
  item: SmartTestPlanItem;
  onClose: () => void;
}

export const WhyRequiredModal: React.FC<Props> = ({ item, onClose }) => {
  const isVerified = item.verificationStatus === 'VERIFIED';
  const isApplicable = item.applicabilityStatus === 'APPLICABLE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                OIML Metrological Justification
              </span>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={11} /> VERIFIED RULE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle size={11} /> UNVERIFIED RULE
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Why is this test required?
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Test: {item.testName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Reason / Metrological Explanation */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
              <FileText size={13} className="text-indigo-600" />
              Metrological Rationale
            </span>
            <p className="text-slate-700 leading-relaxed font-sans text-xs">
              {item.applicabilityReason}
            </p>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Standard & Edition
              </span>
              <p className="font-bold text-slate-800">{item.standard}</p>
              <p className="text-[11px] text-slate-600">{item.edition}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Clause & Table Reference
              </span>
              <p className="font-bold text-slate-800 font-mono text-[11px]">{item.clauseRef}</p>
              {item.tableRef && (
                <p className="text-[11px] text-slate-600 font-mono">{item.tableRef}</p>
              )}
            </div>
          </div>

          {/* Condition that caused this test to apply */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Applicability Determination Condition
            </span>
            <p className="text-slate-700 leading-relaxed font-mono text-[11px]">
              {item.conditionMetDescription}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span className="text-slate-500">Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  isApplicable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {item.applicabilityStatus.replace('_', ' ')}
              </span>
              {item.isMandatory && (
                <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                  MANDATORY FOR INITIAL VERIFICATION
                </span>
              )}
            </div>
          </div>

          {/* Prerequisites / Dependencies */}
          {item.dependencies.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                <Lock size={12} className="text-slate-600" />
                Verified Execution Prerequisites
              </span>
              <ul className="divide-y divide-slate-200 text-[11px]">
                {item.dependencies.map((dep, idx) => (
                  <li key={idx} className="py-1.5 space-y-0.5 first:pt-0 last:pb-0">
                    <span className="font-bold text-slate-800 block">
                      {dep.prerequisiteName}
                    </span>
                    <p className="text-slate-500 text-[10px]">{dep.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Official Source Reference */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
              <BookOpen size={12} className="text-indigo-600" />
              Authoritative Source of Truth
            </span>
            <p className="text-slate-700 font-mono text-[11px]">
              {item.sourceReference}
            </p>
            <a
              href="https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline pt-0.5"
            >
              Open official OIML R 76-1:2006 (PDF) <ExternalLink size={11} />
            </a>
          </div>

          {/* Absolute Safety Notice */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-[11px] text-emerald-800">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              Deterministic rule evaluation. Zero LLM interpolation or hallucinated metrology.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
