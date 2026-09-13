import React from 'react';
import {
  X,
  ShieldCheck,
  GitBranch,
  Database,
  CheckCircle2,
  Clock,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { RuleDecisionContext, SmartTestPlanItem } from '../../metrology/sequencing/sequencingTypes';

interface Props {
  item: SmartTestPlanItem;
  decisionContext?: RuleDecisionContext;
  onClose: () => void;
}

export const RuleTraceabilityModal: React.FC<Props> = ({ item, decisionContext, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <GitBranch size={11} /> Metrology Decision Audit Trail
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Rule ID: {item.ruleId}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Rule Traceability & Decision Context
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic verification decision path for {item.testName}
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Decision Path Tree */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-600 block">
              Automated Decision Pipeline
            </span>

            <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Step 1: Instrument Configuration */}
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-100 border border-indigo-400 text-indigo-700 flex items-center justify-center font-mono text-[10px] font-bold">
                  1
                </span>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Instrument Parameter Ingestion
                  </span>
                  {decisionContext?.instrumentFieldsEvaluated ? (
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] bg-slate-50 p-2 rounded border border-slate-100">
                      {Object.entries(decisionContext.instrumentFieldsEvaluated).map(([key, val]) => (
                        <div key={key} className="truncate">
                          <span className="text-slate-400">{key}:</span>{' '}
                          <span className="text-slate-800 font-semibold">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[10px]">
                      Parameters evaluated from current instrument configuration.
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Rule Evaluator */}
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-100 border border-indigo-400 text-indigo-700 flex items-center justify-center font-mono text-[10px] font-bold">
                  2
                </span>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Verified Rule Condition Evaluation ({item.clauseRef})
                  </span>
                  <p className="text-slate-600 text-[11px] font-sans">
                    Result: <strong className="text-slate-900">{item.applicabilityStatus}</strong> -{' '}
                    {item.applicabilityReason}
                  </p>
                </div>
              </div>

              {/* Step 3: Dependency Resolution */}
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-indigo-100 border border-indigo-400 text-indigo-700 flex items-center justify-center font-mono text-[10px] font-bold">
                  3
                </span>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">
                    Topological Dependency & Sequence Evaluation
                  </span>
                  {decisionContext?.dependenciesEvaluated && decisionContext.dependenciesEvaluated.length > 0 ? (
                    <div className="space-y-1 text-[10px]">
                      {decisionContext.dependenciesEvaluated.map((dep, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 font-mono"
                        >
                          <span className="text-slate-700">{dep.prerequisiteName}</span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                              dep.satisfied
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {dep.satisfied ? 'SATISFIED' : 'PENDING'} ({dep.stateFound})
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[10px]">No prerequisites required. Initial entry point.</p>
                  )}
                </div>
              </div>

              {/* Step 4: Final Workflow State */}
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 border border-emerald-500 text-emerald-700 flex items-center justify-center font-mono text-[10px] font-bold">
                  ✓
                </span>
                <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                  <span className="font-bold text-emerald-900 block text-[11px]">
                    Current Execution State: {item.executionStatus}
                  </span>
                  <p className="text-emerald-800 text-[10px]">
                    Sequence Position: #{item.sequenceOrder} in standard OIML workflow.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Engine & Standard Version Metadata */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">
                Engine & Algorithm
              </span>
              <p className="text-slate-800 font-bold">{decisionContext?.engineVersion || 'OIML-R76-SEQ-v1.0.0'}</p>
              <p className="text-slate-500 text-[10px]">Deterministic Metrology Engine</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">
                Evaluation Timestamp
              </span>
              <p className="text-slate-800 font-bold">
                {decisionContext?.timestamp
                  ? new Date(decisionContext.timestamp).toLocaleString()
                  : new Date().toLocaleString()}
              </p>
              <p className="text-slate-500 text-[10px]">Audit timestamp logged</p>
            </div>
          </div>

          {/* Reference Source */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Official Reference Standard
            </span>
            <p className="text-slate-700 font-mono text-[11px]">{item.sourceReference}</p>
            <a
              href="https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline pt-0.5"
            >
              Open authoritative OIML R 76-1:2006 (PDF) <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            Close Traceability Panel
          </button>
        </div>
      </div>
    </div>
  );
};
