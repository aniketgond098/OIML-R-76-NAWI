import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  AlertCircle,
  Clock,
  HelpCircle,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SmartTestPlan,
  SmartTestPlanItem,
  SmartTestState,
} from '../../metrology/sequencing/sequencingTypes';
import { TestSession } from '../../types/testSession';
import { Instrument } from '../../types/instrument';
import { WhyRequiredModal } from './WhyRequiredModal';
import { RuleTraceabilityModal } from './RuleTraceabilityModal';
import { testSequencingEngine } from '../../metrology/sequencing/testSequencingEngine';

interface Props {
  session: TestSession;
  currentInstrument?: Instrument;
  onNavigateToTab: (tab: 'weighing' | 'repeatability' | 'eccentricity' | 'zerotare' | 'environmental') => void;
  onRegeneratePlan?: (newPlan: SmartTestPlan) => void;
  isReadOnly?: boolean;
}

type FilterType = 'ALL' | 'APPLICABLE' | 'READY' | 'LOCKED' | 'COMPLETED' | 'EXEMPT';

export const SmartSequencingPanel: React.FC<Props> = ({
  session,
  currentInstrument,
  onNavigateToTab,
  onRegeneratePlan,
  isReadOnly,
}) => {
  const [selectedItemForWhy, setSelectedItemForWhy] = useState<SmartTestPlanItem | null>(null);
  const [selectedItemForTrace, setSelectedItemForTrace] = useState<SmartTestPlanItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  // If session doesn't have smartTestPlan yet, generate on the fly
  const plan: SmartTestPlan =
    session.smartTestPlan ||
    testSequencingEngine.generateSmartTestPlan(
      (currentInstrument || session.instrumentSnapshot) as Instrument,
      session
    );

  // Check for configuration drift if currentInstrument is provided
  const configDiff =
    currentInstrument && plan.instrumentSnapshot
      ? testSequencingEngine.detectConfigurationChange(plan.instrumentSnapshot, currentInstrument)
      : { hasChanged: false, differences: [] };

  const handleRegenerate = () => {
    if (!currentInstrument || isReadOnly || plan.isFinalized) return;
    const newPlan = testSequencingEngine.generateSmartTestPlan(currentInstrument, session);
    if (onRegeneratePlan) {
      onRegeneratePlan(newPlan);
    }
  };

  // Filter items
  const filteredItems = plan.items.filter((item) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'APPLICABLE') return item.applicabilityStatus === 'APPLICABLE';
    if (activeFilter === 'READY') return item.executionStatus === 'READY';
    if (activeFilter === 'LOCKED') return item.executionStatus === 'LOCKED' || item.executionStatus === 'BLOCKED';
    if (activeFilter === 'COMPLETED') return item.executionStatus === 'COMPLETED';
    if (activeFilter === 'EXEMPT')
      return item.applicabilityStatus === 'NOT_APPLICABLE' || item.applicabilityStatus === 'UNVERIFIED';
    return true;
  });

  const percentComplete =
    plan.summary.applicableCount > 0
      ? Math.round((plan.summary.completedCount / plan.summary.applicableCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Modals */}
      {selectedItemForWhy && (
        <WhyRequiredModal
          item={selectedItemForWhy}
          onClose={() => setSelectedItemForWhy(null)}
        />
      )}

      {selectedItemForTrace && (
        <RuleTraceabilityModal
          item={selectedItemForTrace}
          decisionContext={plan.auditDecisionContexts?.[selectedItemForTrace.testId]}
          onClose={() => setSelectedItemForTrace(null)}
        />
      )}

      {/* Sealed / Protected Report Notice */}
      {plan.isFinalized && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-amber-700 shrink-0" />
            <div>
              <span className="font-bold block">Finalized Report Protection Active</span>
              <p className="text-amber-700">
                This verification session is approved. The test plan, rule set version, and
                metrology decisions are permanently frozen and tamper-proof.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 bg-amber-100/80 rounded border border-amber-300 font-bold">
            SEALED
          </span>
        </div>
      )}

      {/* Configuration Drift Warning */}
      {configDiff.hasChanged && !plan.isFinalized && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 shadow-2xs space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  Instrument Metrological Configuration Modified
                </span>
                <p className="text-rose-700">
                  The instrument record has changed since this test session was initialized. The test
                  plan applicability may need updating.
                </p>
              </div>
            </div>
            {!isReadOnly && (
              <button
                onClick={handleRegenerate}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
              >
                <RefreshCw size={12} /> Regenerate Test Plan
              </button>
            )}
          </div>
          <ul className="list-disc list-inside text-[11px] text-rose-800 font-mono pl-6">
            {configDiff.differences.map((diff, idx) => (
              <li key={idx}>{diff}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Sequencing Overview Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <Sparkles size={10} /> Smart Test Sequencing Engine
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {plan.standardEdition}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Prescribed Metrology Verification Plan
            </h3>
            <p className="text-xs text-slate-500">
              Rule-driven execution order with verified prerequisite validation under OIML R 76-1:2006.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                Progress
              </span>
              <span className="text-lg font-bold text-slate-900">
                {plan.summary.completedCount} / {plan.summary.applicableCount}
              </span>
              <span className="text-[11px] text-slate-500 ml-1 font-sans">Applicable</span>
            </div>

            <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] uppercase font-bold mr-1 flex items-center gap-1">
            <SlidersHorizontal size={12} /> Filter:
          </span>
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            All Tests ({plan.summary.totalTests})
          </button>
          <button
            onClick={() => setActiveFilter('APPLICABLE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'APPLICABLE'
                ? 'bg-slate-900 text-white shadow-2xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Applicable ({plan.summary.applicableCount})
          </button>
          <button
            onClick={() => setActiveFilter('READY')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'READY'
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            Ready to Test ({plan.summary.readyCount})
          </button>
          <button
            onClick={() => setActiveFilter('LOCKED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'LOCKED'
                ? 'bg-amber-600 text-white shadow-2xs font-bold'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
            }`}
          >
            Locked ({plan.summary.lockedCount + plan.summary.blockedCount})
          </button>
          <button
            onClick={() => setActiveFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            Completed ({plan.summary.completedCount})
          </button>
          <button
            onClick={() => setActiveFilter('EXEMPT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeFilter === 'EXEMPT'
                ? 'bg-slate-600 text-white shadow-2xs font-bold'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Exempt / Unverified ({plan.summary.notApplicableCount + plan.summary.unverifiedCount})
          </button>
        </div>

        {/* Sequential Test Plan Cards */}
        <div className="space-y-3">
          {filteredItems.map((item, idx) => {
            const isReady = item.executionStatus === 'READY';
            const isCompleted = item.executionStatus === 'COMPLETED';
            const isLocked = item.executionStatus === 'LOCKED';
            const isBlocked = item.executionStatus === 'BLOCKED';
            const isNotApplicable = item.applicabilityStatus === 'NOT_APPLICABLE';
            const isInsufficient = item.applicabilityStatus === 'INSUFFICIENT_DATA';
            const isUnverified = item.applicabilityStatus === 'UNVERIFIED';

            return (
              <div
                key={item.testId}
                className={`p-4 rounded-xl border transition-all duration-150 ${
                  isReady
                    ? 'bg-white border-indigo-200 ring-1 ring-indigo-500/20 shadow-xs'
                    : isCompleted
                    ? 'bg-white border-emerald-200/80 shadow-2xs'
                    : isBlocked
                    ? 'bg-rose-50/40 border-rose-200'
                    : isLocked
                    ? 'bg-slate-50/70 border-slate-200 text-slate-700'
                    : 'bg-slate-50/40 border-slate-200/80 opacity-80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left info column */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Sequence Number */}
                      <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-mono text-[10px] font-bold">
                        {item.sequenceOrder}
                      </span>

                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {item.testName}
                      </h4>

                      {/* Mandatory Badge */}
                      {item.isMandatory && item.applicabilityStatus === 'APPLICABLE' && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Mandatory
                        </span>
                      )}

                      {/* Clause Reference */}
                      <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.clauseRef}
                      </span>

                      {/* Rule Verification status */}
                      {item.verificationStatus === 'VERIFIED' ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                          <AlertCircle size={10} /> Unverified
                        </span>
                      )}
                    </div>

                    {/* Condition & Description snippet */}
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                      {item.applicabilityReason}
                    </p>

                    {/* Prerequisite and Blocking Warnings */}
                    {item.blockingReasons && item.blockingReasons.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          {isBlocked ? (
                            <ShieldAlert size={13} className="text-rose-600" />
                          ) : (
                            <Lock size={13} className="text-amber-600" />
                          )}
                          <span>
                            {isBlocked ? 'Prerequisite Failure' : 'Sequencing Dependency Constraint'}
                          </span>
                        </div>
                        <ul className="list-disc list-inside text-[10px] text-amber-800 space-y-0.5">
                          {item.blockingReasons.map((reason, rIdx) => (
                            <li key={rIdx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing data warnings */}
                    {isInsufficient && item.missingFields && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                        <span className="font-bold">Cannot determine test applicability.</span> Missing information:
                        <ul className="list-disc list-inside text-[10px] pl-2 font-mono">
                          {item.missingFields.map((f, fIdx) => (
                            <li key={fIdx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Status & Action Column */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2.5 shrink-0">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {isReady && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 animate-pulse">
                          <CheckCircle2 size={12} /> READY TO TEST
                        </span>
                      )}

                      {isCompleted && (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            item.complianceStatus === 'PASS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-300'
                          }`}
                        >
                          <CheckCircle2 size={12} /> COMPLETED ({item.complianceStatus})
                        </span>
                      )}

                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          <Lock size={12} className="text-slate-500" /> LOCKED
                        </span>
                      )}

                      {isBlocked && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <ShieldAlert size={12} className="text-rose-600" /> BLOCKED
                        </span>
                      )}

                      {isNotApplicable && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          NOT APPLICABLE
                        </span>
                      )}

                      {isInsufficient && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          INSUFFICIENT DATA
                        </span>
                      )}

                      {isUnverified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          UNVERIFIED RULE
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSelectedItemForWhy(item)}
                        className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-md border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1 text-[11px] font-medium"
                        title="View official metrological reason"
                      >
                        <HelpCircle size={12} /> Why is this test required?
                      </button>

                      <button
                        onClick={() => setSelectedItemForTrace(item)}
                        className="px-2.5 py-1 text-slate-600 hover:text-purple-600 hover:bg-purple-50/60 rounded-md border border-slate-200 hover:border-purple-200 transition-colors flex items-center gap-1 text-[11px] font-medium"
                        title="View decision context and rule metadata"
                      >
                        <GitBranch size={12} /> Traceability
                      </button>

                      {/* Primary Navigation button */}
                      {(isReady || isCompleted) && (
                        <button
                          onClick={() => onNavigateToTab(item.workflowTab)}
                          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs ${
                            isReady
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                          }`}
                        >
                          {isReady ? 'Start Test' : 'Review Results'} <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
