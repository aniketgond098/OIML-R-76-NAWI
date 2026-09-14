import React, { useState, useEffect } from 'react';
import { TestSession } from '../../../types/testSession';
import { SmartTestPlanItem, SmartTestPlan } from '../../../metrology/sequencing/sequencingTypes';
import { storageService } from '../../../services/storage/storageService';
import { db } from '../../../services/storage/database';
import { WhyAmIDoingThisModal } from './WhyAmIDoingThisModal';
import { GuidedZeroStep } from './GuidedZeroStep';
import { GuidedTareStep } from './GuidedTareStep';
import { GuidedRepeatabilityStep } from './GuidedRepeatabilityStep';
import { GuidedEccentricityStep } from './GuidedEccentricityStep';
import { GuidedWeighingStep } from './GuidedWeighingStep';
import { GuidedEnvironmentalStep } from './GuidedEnvironmentalStep';
import { GuidedDiscriminationStep } from './GuidedDiscriminationStep';
import { GuidedTemperatureSpanStep } from './GuidedTemperatureSpanStep';
import { GuidedTiltingStep } from './GuidedTiltingStep';
import { GuidedAdditionalQCChecksStep } from './GuidedAdditionalQCChecksStep';
import { TechnicalSheetView } from '../TechnicalSheetView';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  FileCheck,
  HardDrive,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  FileText,
  Wrench,
} from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateSession: (updates: Partial<TestSession>) => void;
  onSwitchToExpertView: () => void;
  onNavigateToInstruments?: () => void;
  onViewReport?: (reportId: string) => void;
}

export const GuidedTestContainer: React.FC<Props> = ({
  session,
  isReadOnly,
  onUpdateSession,
  onSwitchToExpertView,
  onNavigateToInstruments,
  onViewReport,
}) => {
  const inst = session.instrumentSnapshot;
  const smartPlan: SmartTestPlan | undefined = session.smartTestPlan;

  // Filter items: applicable vs not applicable
  const allItems = smartPlan?.items || [];
  const applicableItems = allItems.filter(
    (item) => item.executionStatus !== 'NOT_APPLICABLE'
  );
  const notApplicableItems = allItems.filter(
    (item) => item.executionStatus === 'NOT_APPLICABLE'
  );

  // Find current active test item
  const [activeTestId, setActiveTestId] = useState<string>(() => {
    // Default to first test that is READY or IN_PROGRESS, or first applicable
    const inProgress = applicableItems.find((i) => i.executionStatus === 'IN_PROGRESS');
    if (inProgress) return inProgress.testId;
    const ready = applicableItems.find((i) => i.executionStatus === 'READY');
    if (ready) return ready.testId;
    const notStarted = applicableItems.find((i) => i.executionStatus === 'NOT_STARTED');
    if (notStarted) return notStarted.testId;
    return applicableItems[0]?.testId || '';
  });

  // Track readiness screen ("Before you begin")
  const [isReadyStarted, setIsReadyStarted] = useState<boolean>(false);

  // View Mode: 'guided' (default) vs 'technical-sheet'
  const [viewMode, setViewMode] = useState<'guided' | 'technical-sheet'>('guided');
  const [showAdditionalQC, setShowAdditionalQC] = useState<boolean>(false);

  // Track completion modal/card
  const [completedTest, setCompletedTest] = useState<SmartTestPlanItem | null>(null);

  // Why modal state
  const [whyModalItem, setWhyModalItem] = useState<SmartTestPlanItem | null>(null);

  // Collapsed sections
  const [showNotApplicable, setShowNotApplicable] = useState<boolean>(false);
  const [showAdvancedAudit, setShowAdvancedAudit] = useState<boolean>(false);

  // Offline banner alert states
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  useEffect(() => {
    let wasOnline = navigator.onLine;
    const unsubscribe = storageService.subscribeSyncStatus((status) => {
      if (!status.isOnline && wasOnline) {
        setOfflineNotice('Connection lost. Your work is being saved on this device.');
        wasOnline = false;
      } else if (status.isOnline && !wasOnline) {
        setOfflineNotice('Connection restored. Your work has been synchronized.');
        wasOnline = true;
        const timer = setTimeout(() => setOfflineNotice(null), 4000);
        return () => clearTimeout(timer);
      }
    });
    return () => unsubscribe();
  }, []);

  const currentItem = applicableItems.find((i) => i.testId === activeTestId);
  const currentStepIndex = applicableItems.findIndex((i) => i.testId === activeTestId);
  const totalSteps = applicableItems.length;

  // Completed count
  const completedCount = applicableItems.filter(
    (i) => i.executionStatus === 'COMPLETED'
  ).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Next available test
  const getNextTest = (fromIndex: number): SmartTestPlanItem | undefined => {
    for (let i = fromIndex + 1; i < applicableItems.length; i++) {
      if (applicableItems[i].executionStatus !== 'COMPLETED') {
        return applicableItems[i];
      }
    }
    return undefined;
  };

  // Handle saving and advancing
  const handleSaveAndAdvance = (testItem: SmartTestPlanItem, updates: Partial<TestSession>) => {
    onUpdateSession(updates);
    setCompletedTest(testItem);
  };

  const handleSkipTest = (item: SmartTestPlanItem) => {
    const updatedTestPlan = (session.testPlan || []).map((tp) => {
      if (tp.category === item.testCategory || tp.name === item.testName) {
        return { ...tp, status: 'SKIPPED' as const, isApplicable: false, compliance: 'NOT_EVALUATED' as const };
      }
      return tp;
    });

    const next = getNextTest(currentStepIndex);
    if (next) {
      setActiveTestId(next.testId);
    }
    setIsReadyStarted(false);

    onUpdateSession({ testPlan: updatedTestPlan });
  };

  const handleContinueToNext = () => {
    if (!completedTest) return;
    const next = getNextTest(currentStepIndex);
    setCompletedTest(null);
    setIsReadyStarted(false);
    if (next) {
      setActiveTestId(next.testId);
    }
  };

  return (
    <div id="guided-test-container" className="space-y-6 max-w-4xl mx-auto">
      {/* Offline sync notification banner */}
      {offlineNotice && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-amber-400 shrink-0" />
            <span>{offlineNotice}</span>
          </div>
          <button
            onClick={() => setOfflineNotice(null)}
            className="text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Guided Header & Progress Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        {/* Top title and mode switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                {viewMode === 'guided' ? 'Guided Laboratory Mode' : 'Technical Sheet View'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">
                {session.standardEdition || 'OIML R 76-1:2006'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {inst.manufacturer} {inst.model}
            </h2>
            <p className="text-xs text-slate-500">
              Serial Number: <strong className="text-slate-800 font-mono">{inst.serialNumber}</strong> • Class{' '}
              <strong className="text-slate-800">{inst.accuracyClass.replace('CLASS_', '')}</strong> • Max:{' '}
              <strong className="text-slate-800 font-mono">{inst.maxCapacity} {inst.unit}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('guided')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'guided'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal size={13} />
                <span>Guided Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('technical-sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === 'technical-sheet'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={13} />
                <span>Technical Sheet</span>
              </button>
            </div>

            <button
              onClick={onSwitchToExpertView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              title="Switch to detailed metrology observation matrix"
            >
              <SlidersHorizontal size={13} />
              <span>Expert / Audit View</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Simple Step Counts (in Guided Mode) */}
        {viewMode === 'guided' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                {showAdditionalQC
                  ? 'Supplementary QC Inspection'
                  : `Testing Progress: Step ${currentStepIndex + 1} of ${totalSteps}`}
              </span>
              <span className="text-slate-500 font-medium">
                <strong className="text-indigo-600 font-bold">{completedCount}</strong> of {totalSteps} tests completed
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Stepper Carousel / Step Indicators */}
        {viewMode === 'guided' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {applicableItems.map((item, idx) => {
              const isCurrent = !showAdditionalQC && item.testId === activeTestId;
              const isCompleted = item.executionStatus === 'COMPLETED';
              const isLocked = item.executionStatus === 'LOCKED' || item.executionStatus === 'BLOCKED';

              return (
                <button
                  key={item.testId}
                  onClick={() => {
                    setShowAdditionalQC(false);
                    setActiveTestId(item.testId);
                    setIsReadyStarted(false);
                    setCompletedTest(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : isLocked
                      ? 'bg-slate-50 text-slate-400 border-slate-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  ) : isLocked ? (
                    <Lock size={12} className="text-slate-400 shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                  )}
                  <span>
                    {idx + 1}. {item.testName.replace(' Verification Test', '').replace(' Test', '')}
                  </span>
                </button>
              );
            })}

            {/* Supplementary QC Checks Pill */}
            <button
              onClick={() => {
                setShowAdditionalQC(true);
                setCompletedTest(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border ${
                showAdditionalQC
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : session.additionalQCChecks?.overallQcStatus === 'PASS'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Wrench size={13} />
              <span>Supplementary QC</span>
              {session.additionalQCChecks && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 ml-0.5">
                  {session.additionalQCChecks.overallQcStatus}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* TECHNICAL SHEET VIEW */}
      {viewMode === 'technical-sheet' ? (
        <TechnicalSheetView
          session={session}
          onJumpToTest={(testId) => {
            setViewMode('guided');
            if (testId === 'test-additional-qc') {
              setShowAdditionalQC(true);
            } else {
              setShowAdditionalQC(false);
              const match = applicableItems.find((i) =>
                i.testId === testId ||
                i.testCategory.toLowerCase().includes(testId.replace('test-', '')) ||
                i.testName.toLowerCase().includes(testId.replace('test-', ''))
              );
              if (match) {
                setActiveTestId(match.testId);
              }
              setIsReadyStarted(true);
            }
          }}
        />
      ) : showAdditionalQC ? (
        <GuidedAdditionalQCChecksStep
          session={session}
          isReadOnly={isReadOnly}
          onSave={(checks) => {
            onUpdateSession({ additionalQCChecks: checks });
            setShowAdditionalQC(false);
          }}
          onBackToOverview={() => setShowAdditionalQC(false)}
        />
      ) : (
        <>
          {/* TEST COMPLETION OVERLAY / CARD */}
      {completedTest && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 sm:p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={32} />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
              Test Completed ✓
            </span>
            <h3 className="text-xl font-bold text-slate-900">{completedTest.testName}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All required measurements have been recorded and evaluated against OIML R 76-1:2006 requirements.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold">
            Result: PASS
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setCompletedTest(null);
                setIsReadyStarted(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors w-full sm:w-auto"
            >
              Review Test Readings
            </button>

            {getNextTest(currentStepIndex) ? (
              <button
                onClick={handleContinueToNext}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>Continue to Next: {getNextTest(currentStepIndex)?.testName}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onSwitchToExpertView}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <span>All Tests Finished — Proceed to Final Review</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE STEP CONTENT */}
      {!completedTest && currentItem && (
        <div>
          {/* CASE 1: MISSING INFORMATION */}
          {currentItem.executionStatus === 'INSUFFICIENT_DATA' && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-6 sm:p-8 space-y-4 text-center max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  Action Required
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Missing Instrument Information
                </h3>
                <p className="text-xs text-slate-600">
                  We need one more piece of information before testing can continue.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                {currentItem.applicabilityReason}
              </div>

              {onNavigateToInstruments && (
                <button
                  onClick={onNavigateToInstruments}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Go to Instrument Details
                </button>
              )}
            </div>
          )}

          {/* CASE 2: LOCKED TEST */}
          {(currentItem.executionStatus === 'LOCKED' || currentItem.executionStatus === 'BLOCKED') && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-6 sm:p-8 space-y-5 text-center max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Lock size={24} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">
                  Next Test
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  🔒 This test is not ready yet
                </h3>
                <p className="text-xs text-slate-600">
                  Under OIML R 76-1:2006 metrological procedures, tests must follow a verified sequence.
                </p>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 text-left space-y-2">
                <span className="text-xs font-bold text-amber-950 block">
                  First complete:
                </span>
                <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
                  {currentItem.dependencies.map((dep, idx) => (
                    <li key={idx}>
                      <strong>{dep.prerequisiteName}</strong>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-800 pt-1">
                  Once the prerequisite test is completed and meets requirements, this test will unlock automatically.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                {currentItem.dependencies[0] && (
                  <button
                    onClick={() => {
                      const prereq = applicableItems.find(
                        (i) => i.testId === currentItem.dependencies[0].prerequisiteTestId
                      );
                      if (prereq) {
                        setActiveTestId(prereq.testId);
                        setIsReadyStarted(false);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                  >
                    Go to {currentItem.dependencies[0].prerequisiteName}
                  </button>
                )}
                <button
                  onClick={() => setWhyModalItem(currentItem)}
                  className="text-xs text-indigo-600 hover:underline font-semibold"
                >
                  View reason
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: READY BUT NOT YET STARTED */}
          {currentItem.executionStatus !== 'LOCKED' &&
            currentItem.executionStatus !== 'BLOCKED' &&
            currentItem.executionStatus !== 'INSUFFICIENT_DATA' &&
            !isReadyStarted &&
            currentItem.executionStatus !== 'COMPLETED' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8 space-y-6 max-w-xl mx-auto">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600">
                    Step {currentStepIndex + 1} of {totalSteps}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">{currentItem.testName}</h3>
                  <p className="text-xs text-slate-500">
                    Standard: {currentItem.edition || 'OIML R 76-1:2006'} ({currentItem.clauseRef})
                  </p>
                </div>

                {/* Plain language purpose */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  {currentItem.applicabilityReason}
                </div>

                {/* Before you begin checklist */}
                <div className="p-5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Before you begin:
                  </h4>
                  <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5">
                    <li>Make sure the instrument is correctly installed and leveled.</li>
                    <li>Make sure the required reference test load is clean and available.</li>
                    <li>Ensure the instrument is powered on and stabilized.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWhyModalItem(currentItem)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <HelpCircle size={14} /> Why am I doing this test?
                  </button>

                  <button
                    onClick={() => setIsReadyStarted(true)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                  >
                    <span>✓ I'm ready to begin</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

          {/* CASE 4: ACTIVE GUIDED TESTING FLOW */}
          {(isReadyStarted || currentItem.executionStatus === 'COMPLETED') &&
            currentItem.executionStatus !== 'LOCKED' &&
            currentItem.executionStatus !== 'BLOCKED' &&
            currentItem.executionStatus !== 'INSUFFICIENT_DATA' && (
              <div>
                {/* ZERO SETTING */}
                {currentItem.testCategory === 'ZERO_SETTING' && (
                  <GuidedZeroStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { zeroSettingObservation: obs })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* TARE */}
                {currentItem.testCategory === 'TARE' && (
                  <GuidedTareStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { tareObservation: obs })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* REPEATABILITY */}
                {currentItem.testCategory === 'REPEATABILITY' && (
                  <GuidedRepeatabilityStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(series) => handleSaveAndAdvance(currentItem, { repeatabilitySeries: series })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* ECCENTRICITY */}
                {currentItem.testCategory === 'ECCENTRICITY' && (
                  <GuidedEccentricityStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { eccentricityObservations: obs })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* WEIGHING */}
                {currentItem.testCategory === 'WEIGHING_ACCURACY' && (
                  <GuidedWeighingStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { weighingObservations: obs })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* DISCRIMINATION */}
                {currentItem.testCategory === 'DISCRIMINATION' && (
                  <GuidedDiscriminationStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { discriminationObservation: obs })}
                    onSkip={() => handleSkipTest(currentItem)}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* TEMPERATURE SPAN STABILITY */}
                {currentItem.testCategory === 'TEMPERATURE_SPAN' && (
                  <GuidedTemperatureSpanStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs, readings) =>
                      handleSaveAndAdvance(currentItem, {
                        temperatureSpanObservation: obs,
                        ...(readings ? { environmentalReadings: readings } : {}),
                      })
                    }
                    onSkip={() => handleSkipTest(currentItem)}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* TILTING */}
                {currentItem.testCategory === 'TILTING' && (
                  <GuidedTiltingStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(obs) => handleSaveAndAdvance(currentItem, { tiltingObservation: obs })}
                    onSkip={() => handleSkipTest(currentItem)}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}

                {/* FALLBACK ENVIRONMENTAL */}
                {currentItem.workflowTab === 'environmental' &&
                  currentItem.testCategory !== 'TEMPERATURE_SPAN' &&
                  currentItem.testCategory !== 'TILTING' && (
                  <GuidedEnvironmentalStep
                    session={session}
                    isReadOnly={isReadOnly}
                    onSave={(readings) => handleSaveAndAdvance(currentItem, { environmentalReadings: readings })}
                    onWhyClick={() => setWhyModalItem(currentItem)}
                    onBackToOverview={() => setIsReadyStarted(false)}
                  />
                )}
              </div>
            )}
        </div>
      )}

      {/* COLLAPSIBLE SECTION: TESTS NOT REQUIRED FOR THIS INSTRUMENT */}
      {notApplicableItems.length > 0 && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowNotApplicable(!showNotApplicable)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-xs text-slate-700 hover:bg-slate-100/80 transition-colors font-medium"
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-bold">✓ {applicableItems.length} tests required</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">— {notApplicableItems.length} tests not required for this instrument</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-slate-500">
              <span>{showNotApplicable ? 'Hide' : 'View'}</span>
              {showNotApplicable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {showNotApplicable && (
            <div className="p-4 border-t border-slate-200 space-y-2.5 bg-white">
              {notApplicableItems.map((item) => (
                <div
                  key={item.testId}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{item.testName}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                      Not Required
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {item.applicabilityReason}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Clause: {item.clauseRef} • Status: Verified OIML Rule
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADVANCED DETAILS / AUDIT TRAY */}
      {currentItem && (
        <div className="border-t border-slate-200 pt-4 text-center">
          <button
            onClick={() => setShowAdvancedAudit(!showAdvancedAudit)}
            className="text-xs text-slate-400 hover:text-slate-700 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>Advanced Metrology Details & Rule Audit</span>
            {showAdvancedAudit ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAdvancedAudit && (
            <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs font-mono space-y-2 text-slate-700 max-w-2xl mx-auto">
              <div>
                <span className="text-slate-400">Current Rule ID:</span>{' '}
                <span className="font-bold text-slate-900">{currentItem.ruleId}</span>
              </div>
              <div>
                <span className="text-slate-400">OIML Reference:</span>{' '}
                <span className="text-slate-800">{currentItem.edition} ({currentItem.clauseRef})</span>
              </div>
              <div>
                <span className="text-slate-400">Verification Status:</span>{' '}
                <span className="text-emerald-700 font-bold">{currentItem.verificationStatus}</span>
              </div>
              <div>
                <span className="text-slate-400">Condition Met:</span>{' '}
                <span className="font-sans text-slate-800">{currentItem.conditionMetDescription}</span>
              </div>
              <div>
                <span className="text-slate-400">Execution State:</span>{' '}
                <span className="text-slate-900 font-bold">{currentItem.executionStatus}</span>
              </div>
              {currentItem.blockingReasons && currentItem.blockingReasons.length > 0 && (
                <div>
                  <span className="text-slate-400">Blocking Reasons:</span>
                  <ul className="list-disc list-inside text-rose-700 pl-1 font-sans">
                    {currentItem.blockingReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* WHY AM I DOING THIS MODAL */}
      {whyModalItem && (
        <WhyAmIDoingThisModal
          item={whyModalItem}
          onClose={() => setWhyModalItem(null)}
        />
      )}
    </div>
  );
};
