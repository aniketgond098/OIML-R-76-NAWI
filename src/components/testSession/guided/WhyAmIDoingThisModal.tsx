import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { SmartTestPlanItem } from '../../../metrology/sequencing/sequencingTypes';

interface Props {
  item: SmartTestPlanItem;
  onClose: () => void;
}

export const WhyAmIDoingThisModal: React.FC<Props> = ({ item, onClose }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isVerified = item.verificationStatus === 'VERIFIED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Simple Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Laboratory Guide
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Why am I doing this test?
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {item.testName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Main Plain Language Explanation */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
              Test Purpose
            </span>
            <p className="text-slate-700 leading-relaxed text-xs">
              {item.applicabilityReason}
            </p>
          </div>

          {/* Simple Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Standard
              </span>
              <p className="font-bold text-slate-800 text-xs">{item.edition || item.standard}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Official Reference
              </span>
              <p className="font-bold text-slate-800 text-xs font-mono">{item.clauseRef}</p>
            </div>
          </div>

          {/* Rule Status */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Rule Verification Status:</span>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 size={13} /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle size={13} /> Requires Review
              </span>
            )}
          </div>

          {/* Collapsible Advanced Technical Details */}
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-semibold py-1 transition-colors"
            >
              <span>Advanced Metrology Details</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-[11px] font-mono animate-in fade-in">
                <div>
                  <span className="text-slate-400">Rule ID:</span>{' '}
                  <span className="text-slate-800 font-bold">{item.ruleId}</span>
                </div>
                <div>
                  <span className="text-slate-400">Condition evaluated:</span>{' '}
                  <span className="text-slate-700 font-sans">{item.conditionMetDescription}</span>
                </div>
                <div>
                  <span className="text-slate-400">Source:</span>{' '}
                  <span className="text-slate-700">{item.sourceReference}</span>
                </div>
                {item.dependencies.length > 0 && (
                  <div>
                    <span className="text-slate-400">Prerequisites:</span>
                    <ul className="list-disc list-inside text-slate-700 pl-1 font-sans">
                      {item.dependencies.map((d, i) => (
                        <li key={i}>{d.prerequisiteName}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <a
                  href="https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline pt-1 font-sans font-semibold"
                >
                  View official OIML R 76-1:2006 (PDF) <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2 text-[11px] text-emerald-800">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>
              This requirement is directly traceable to the official OIML R 76 standard.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
