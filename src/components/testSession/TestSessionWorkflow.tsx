import React, { useState } from 'react';
import { TestSession } from '../../types/testSession';
import { ComplianceStatus } from '../../types/metrology';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import { evaluateOverallTestSessionCompliance } from '../../metrology/compliance/complianceEngine';
import { WeighingTestTab } from './tabs/WeighingTestTab';
import { RepeatabilityTestTab } from './tabs/RepeatabilityTestTab';
import { EccentricityTestTab } from './tabs/EccentricityTestTab';
import { ZeroTareTestTab } from './tabs/ZeroTareTestTab';
import { EnvironmentalTestTab } from './tabs/EnvironmentalTestTab';
import { ReviewTab } from './tabs/ReviewTab';
import { SmartSequencingPanel } from './SmartSequencingPanel';
import { GuidedTestContainer } from './guided/GuidedTestContainer';
import { testSequencingEngine } from '../../metrology/sequencing/testSequencingEngine';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { StatusBadge } from '../common/StatusBadge';
import { SessionSyncBadge } from '../common/SessionSyncBadge';
import { AttachmentManager } from '../common/AttachmentManager';
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  FileCheck,
  ShieldCheck,
  Scale,
  Activity,
  Layers,
  Thermometer,
  ListChecks,
  Camera,
  Lock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface Props {
  sessionId: string;
  onBack: () => void;
  onViewReport: (reportId: string) => void;
}

export const TestSessionWorkflow: React.FC<Props> = ({ sessionId, onBack, onViewReport }) => {
  const { currentUser, availableUsers, canRecordObservations, canSubmitForReview, canApproveTest } = useAuth();
  const [session, setSession] = useState<TestSession | undefined>(() => db.getTestSession(sessionId));

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Test session not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
          Return to List
        </button>
      </div>
    );
  }

  // User can switch between 'guided' (simple step-by-step for technicians) and 'expert' (audit matrix & multi-tab grid)
  const [viewMode, setViewMode] = useState<'guided' | 'expert'>('guided');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<
    'sequencing' | 'weighing' | 'repeatability' | 'eccentricity' | 'zerotare' | 'environmental' | 'attachments' | 'review'
  >('sequencing');
  const [saveToast, setSaveToast] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const inst = session.instrumentSnapshot;
  const isReadOnly = session.status === 'REPORT_GENERATED' || session.status === 'APPROVED';
  const currentInstrument = db.getInstrument(session.instrumentId);

  // Check if a workflow tab is locked by verified OIML sequencing rules
  const getTabLockInfo = (tabId: string): { isLocked: boolean; isBlocked: boolean; reasons: string[] } => {
    if (!session.smartTestPlan) return { isLocked: false, isBlocked: false, reasons: [] };
    const itemsForTab = session.smartTestPlan.items.filter((i) => i.workflowTab === tabId);
    const blockedItem = itemsForTab.find((i) => i.executionStatus === 'BLOCKED');
    if (blockedItem) {
      return { isLocked: true, isBlocked: true, reasons: blockedItem.blockingReasons || [] };
    }
    const lockedItem = itemsForTab.find((i) => i.executionStatus === 'LOCKED');
    if (lockedItem) {
      return { isLocked: true, isBlocked: false, reasons: lockedItem.blockingReasons || [] };
    }
    return { isLocked: false, isBlocked: false, reasons: [] };
  };

  // Helper to re-evaluate compliance on changes and persist
  const saveUpdatedSession = (updates: Partial<TestSession>) => {
    setSession((prevSession) => {
      const baseSession = prevSession || db.getTestSession(sessionId) || session;
      const merged: TestSession = {
        ...baseSession,
        ...updates,
        status: baseSession.status === 'DRAFT' && !updates.status ? 'IN_PROGRESS' : (updates.status || baseSession.status),
      };

      // Run compliance engine to dynamically synchronize test plan items and overall compliance
      const compEval = evaluateOverallTestSessionCompliance(merged);
      merged.overallCompliance = compEval.overallCompliance;
      merged.complianceSummary = compEval.summary;

      db.updateTestSession(merged, currentUser);
      return merged;
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Submit for Review
  const handleSubmitForReview = () => {
    saveUpdatedSession({
      status: 'UNDER_REVIEW',
    });
  };

  // Reviewer Approve & Seal Report
  const handleApproveAndGenerateReport = async (comments?: string) => {
    setIsFinalizing(true);
    try {
      const report = await db.finalizeAndGenerateReport(
        session.id,
        currentUser,
        comments || 'Full Metrological Verification Approved. All errors within Table 6 limits.'
      );
      onViewReport(report.id);
    } catch (e) {
      console.error('Failed to finalize report:', e);
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleRejectSession = (comments: string) => {
    saveUpdatedSession({
      status: 'DRAFT',
      reviewerComments: comments,
    });
  };

  // Check existing report if any
  const existingReports = db.getReportsForInstrument(session.instrumentId);
  const matchedReport = existingReports.find((r) => r.testSessionId === session.id);

  const getTabCompliance = (tabId: string): ComplianceStatus | undefined => {
    if (!session.testPlan) return undefined;
    if (tabId === 'weighing') {
      return session.testPlan.find((p) => p.category === 'WEIGHING_ACCURACY')?.compliance;
    }
    if (tabId === 'repeatability') {
      return session.testPlan.find((p) => p.category === 'REPEATABILITY')?.compliance;
    }
    if (tabId === 'eccentricity') {
      return session.testPlan.find((p) => p.category === 'ECCENTRICITY')?.compliance;
    }
    if (tabId === 'zerotare') {
      const zero = session.testPlan.find((p) => p.category === 'ZERO_SETTING')?.compliance;
      const tare = session.testPlan.find((p) => p.category === 'TARE')?.compliance;
      if (zero === 'FAIL' || tare === 'FAIL') return 'FAIL';
      if (zero === 'PASS' && tare === 'PASS') return 'PASS';
      if (zero === 'PASS' || tare === 'PASS') return 'PASS';
      return 'NOT_EVALUATED';
    }
    return undefined;
  };

  return (
    <div id="test-session-workflow" className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-3.5 sm:space-y-5 max-w-7xl mx-auto w-full min-w-0">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold shrink-0"
          >
            <ArrowLeft size={16} /> Back to Sessions
          </button>

          {/* Guided Mode vs Expert Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              id="btn-mode-guided"
              onClick={() => setViewMode('guided')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'guided'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles size={13} className={viewMode === 'guided' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Guided Mode</span>
            </button>
            <button
              id="btn-mode-expert"
              onClick={() => setViewMode('expert')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'expert'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal size={13} className={viewMode === 'expert' ? 'text-indigo-600' : 'text-slate-400'} />
              <span>Expert Matrix</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {saveToast && (
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold animate-in fade-in">
              ✓ Observations Saved
            </span>
          )}

          {/* Workflow Action Buttons */}
          {(session.status === 'DRAFT' || session.status === 'IN_PROGRESS') && canSubmitForReview && (
            <button
              id="btn-submit-for-review"
              onClick={handleSubmitForReview}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors w-full sm:w-auto"
            >
              <Send size={14} />
              Submit For Review
            </button>
          )}

          {session.status === 'UNDER_REVIEW' && canApproveTest && (
            <button
              id="btn-approve-and-seal"
              onClick={handleApproveAndGenerateReport}
              disabled={isFinalizing}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              <FileCheck size={15} />
              {isFinalizing ? 'Sealing Report...' : 'Approve & Seal Official Report'}
            </button>
          )}

          {matchedReport && (
            <button
              id="btn-view-generated-report"
              onClick={() => onViewReport(matchedReport.id)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors w-full sm:w-auto"
            >
              <FileCheck size={15} />
              View Sealed Report
            </button>
          )}
        </div>
      </div>

      {viewMode === 'guided' ? (
        <GuidedTestContainer
          session={session}
          isReadOnly={isReadOnly}
          onUpdateSession={saveUpdatedSession}
          onSwitchToExpertView={() => setViewMode('expert')}
          onViewReport={onViewReport}
        />
      ) : (
        <>
          {/* Session Metadata Banner */}
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                {session.testSessionNumber}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {inst.manufacturer} {inst.model}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Class {inst.accuracyClass.replace('CLASS_', '')}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1">
              <span>Serial No: <strong className="text-slate-800 font-mono">{inst.serialNumber}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Standard: <strong className="text-slate-800 font-mono">{session.standardEdition}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1">
                <span>Technician:</span>
                {!isReadOnly ? (
                  <select
                    value={session.technicianId}
                    onChange={(e) => {
                      const u = availableUsers.find((user) => user.id === e.target.value);
                      if (u) {
                        saveUpdatedSession({ technicianId: u.id, technicianName: u.fullName });
                      }
                    }}
                    className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-indigo-500"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong className="text-slate-800">{session.technicianName}</strong>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 pt-2.5 lg:pt-0 border-t lg:border-t-0 border-slate-100 justify-between sm:justify-end">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Session State</span>
              <StatusBadge status={session.status} size="md" />
            </div>
            <div className="text-right pl-2.5 sm:pl-3 border-l border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Compliance</span>
              <ComplianceBadge status={session.overallCompliance} size="md" />
            </div>
            <div className="text-right pl-2.5 sm:pl-3 border-l border-slate-200 hidden sm:block">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Storage Safety</span>
              <SessionSyncBadge sessionId={session.id} />
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'sequencing', label: 'Smart Test Plan', icon: ListChecks },
            { id: 'weighing', label: '1. Weighing Performance', icon: Scale, count: session.weighingObservations?.length || 0 },
            { id: 'repeatability', label: '2. Repeatability (ΔI)', icon: Activity, count: session.repeatabilitySeries?.length || 0 },
            { id: 'eccentricity', label: '3. Eccentricity', icon: Layers, count: session.eccentricityObservations?.length || 0 },
            { id: 'zerotare', label: '4. Zero & Tare', icon: ShieldCheck },
            { id: 'environmental', label: '5. Environmental Span', icon: Thermometer },
            { id: 'attachments', label: '6. Evidence & Photos', icon: Camera, count: session.attachmentIds?.length || 0 },
            { id: 'review', label: '7. Compliance Audit & Decision', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeWorkflowTab === tab.id;
            const comp = getTabCompliance(tab.id);
            const lockInfo = getTabLockInfo(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveWorkflowTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{tab.label}</span>
                {lockInfo.isLocked && (
                  <Lock size={11} className={isActive ? 'text-amber-300' : 'text-amber-500'} title="Locked by prerequisite" />
                )}
                {comp && comp !== 'NOT_EVALUATED' && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      comp === 'PASS'
                        ? isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                        : isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {comp}
                  </span>
                )}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Warning if current tab has locked prerequisites */}
        {activeWorkflowTab !== 'sequencing' &&
          activeWorkflowTab !== 'attachments' &&
          activeWorkflowTab !== 'review' &&
          getTabLockInfo(activeWorkflowTab).isLocked && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    {getTabLockInfo(activeWorkflowTab).isBlocked
                      ? 'Test Blocked: Prerequisite Did Not Satisfy Criteria'
                      : 'Prerequisite Notice: Test Locked by OIML R 76-1 Execution Sequence'}
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 mt-0.5">
                    {getTabLockInfo(activeWorkflowTab).reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setActiveWorkflowTab('sequencing')}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded font-bold text-[11px] transition-colors shrink-0"
              >
                View Smart Test Plan
              </button>
            </div>
          )}

        {activeWorkflowTab === 'sequencing' && (
          <SmartSequencingPanel
            session={session}
            currentInstrument={currentInstrument}
            onNavigateToTab={(tab) => setActiveWorkflowTab(tab)}
            onRegeneratePlan={(newPlan) => saveUpdatedSession({ smartTestPlan: newPlan })}
            isReadOnly={isReadOnly}
          />
        )}

        {activeWorkflowTab === 'weighing' && (
          <WeighingTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateObservations={(weighingObservations) => saveUpdatedSession({ weighingObservations })}
            onUpdateDiscriminationObservation={(discriminationObservation) =>
              saveUpdatedSession({ discriminationObservation })
            }
          />
        )}

        {activeWorkflowTab === 'repeatability' && (
          <RepeatabilityTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateSeries={(repeatabilitySeries) => saveUpdatedSession({ repeatabilitySeries })}
          />
        )}

        {activeWorkflowTab === 'eccentricity' && (
          <EccentricityTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateObservations={(eccentricityObservations) => saveUpdatedSession({ eccentricityObservations })}
          />
        )}

        {activeWorkflowTab === 'zerotare' && (
          <ZeroTareTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateZeroSetting={(zeroSettingObservation) => saveUpdatedSession({ zeroSettingObservation })}
            onUpdateTare={(tareObservation) => saveUpdatedSession({ tareObservation })}
            onUpdateBoth={(zeroSettingObservation, tareObservation) =>
              saveUpdatedSession({ zeroSettingObservation, tareObservation })
            }
          />
        )}

        {activeWorkflowTab === 'environmental' && (
          <EnvironmentalTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateEnvironmentalReadings={(environmentalReadings) => saveUpdatedSession({ environmentalReadings })}
            onUpdateTemperatureSpanObservation={(temperatureSpanObservation) =>
              saveUpdatedSession({ temperatureSpanObservation })
            }
          />
        )}

        {activeWorkflowTab === 'attachments' && (
          <AttachmentManager
            entityType="TEST_SESSION"
            entityId={session.id}
            readOnly={isReadOnly}
          />
        )}

        {activeWorkflowTab === 'review' && (
          <ReviewTab
            session={session}
            isReadOnly={isReadOnly}
            canApprove={canApproveTest}
            onApprove={handleApproveAndGenerateReport}
            onReject={handleRejectSession}
            onSaveNotes={(notes) => saveUpdatedSession({ reviewerComments: notes })}
            onViewReport={onViewReport}
            matchedReport={matchedReport}
          />
        )}
      </div>
    </>
  )}
</div>
  );
};
