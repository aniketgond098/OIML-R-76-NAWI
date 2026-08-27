import React from 'react';
import { Modal } from './Modal';
import { CalculationExplanation } from '../../types/metrology';
import { ComplianceBadge } from './ComplianceBadge';
import { BookOpen, Calculator, CheckSquare, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  explanation: CalculationExplanation | null;
}

export const CalculationModal: React.FC<Props> = ({ isOpen, onClose, explanation }) => {
  if (!explanation) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Metrological Calculation Trace: ${explanation.testType}`}
      subtitle={`${explanation.standard} | Rule: ${explanation.ruleId}`}
      maxWidth="3xl"
    >
      <div id="calculation-modal-content" className="space-y-5">
        {/* Clause Reference Header */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2.5">
            <BookOpen size={16} className="text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Clause Reference</span>
              <span className="text-sm font-bold text-slate-900">{explanation.clauseRef}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Result:</span>
            <ComplianceBadge status={explanation.compliance} size="md" />
          </div>
        </div>

        {/* Input Parameters Matrix */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers size={14} className="text-slate-400" />
            Preserved Observation Inputs & Parameters
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(explanation.inputs).map(([key, val]) => (
              <div key={key} className="p-2.5 bg-white border border-slate-200 rounded-md">
                <span className="text-[11px] text-slate-500 block truncate">{key}</span>
                <span className="text-xs font-semibold text-slate-900 font-mono">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Metadata & Decision Principles */}
        {(explanation.formula || explanation.decisionRule || explanation.roundingRule) && (
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-2 text-xs">
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
              Authoritative OIML Rule Parameters
            </span>
            {explanation.formula && (
              <div>
                <span className="text-slate-500 font-medium">Standard Formula: </span>
                <span className="font-mono font-bold text-indigo-900">{explanation.formula}</span>
              </div>
            )}
            {explanation.decisionRule && (
              <div>
                <span className="text-slate-500 font-medium">Decision Rule: </span>
                <span className="font-mono text-slate-800">{explanation.decisionRule}</span>
              </div>
            )}
            {explanation.roundingRule && (
              <div>
                <span className="text-slate-500 font-medium">Rounding Rule: </span>
                <span className="text-slate-700">{explanation.roundingRule}</span>
              </div>
            )}
          </div>
        )}

        {/* Step by Step Execution Proof */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Calculator size={14} className="text-slate-400" />
            Mathematical Derivation Steps
          </h4>
          <div className="space-y-2.5">
            {explanation.steps.map((step, idx) => (
              <div key={idx} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Step {idx + 1}: {step.stepName}
                  </span>
                  {step.unit && (
                    <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Unit: {step.unit}
                    </span>
                  )}
                </div>

                <div className="font-mono text-xs text-slate-700 bg-white p-2 rounded border border-slate-200/80 space-y-1">
                  <div className="text-slate-500">Formula: <span className="text-slate-900 font-semibold">{step.formula}</span></div>
                  <div className="text-slate-500">Substituted: <span className="text-slate-800">{step.substitution}</span></div>
                  <div className="text-indigo-700 font-bold">Result: {step.result}</div>
                </div>

                {step.notes && (
                  <p className="text-[11px] text-slate-500 italic">{step.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary Decision Card */}
        <div className="p-4 bg-slate-900 text-white rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckSquare size={14} className="text-emerald-400" />
              Final Metrological Evaluation
            </span>
            <span className="font-mono text-xs text-slate-300">{explanation.finalResult}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs">
            <span className="text-slate-400">Requirement Limit:</span>
            <span className="font-semibold text-slate-200">{explanation.limitRequirement}</span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            id="close-calc-proof-btn"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg transition-colors"
          >
            Close Traceability Proof
          </button>
        </div>
      </div>
    </Modal>
  );
};
