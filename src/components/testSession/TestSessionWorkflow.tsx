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
import { ComplianceBadge } from '../common/ComplianceBadge';
import { StatusBadge } from '../common/StatusBadge';
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

  const [activeWorkflowTab, setActiveWorkflowTab] = useState<'weighing' | 'repeatability' | 'eccentricity' | 'zerotare' | 'environmental' | 'review'>('weighing');
  const [saveToast, setSaveToast] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const inst = session.instrumentSnapshot;
  const isReadOnly = session.status === 'REPORT_GENERATED' || session.status === 'APPROVED';

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
  const handleApproveAndGenerateReport = async () => {
    setIsFinalizing(true);
    try {
      const report = await db.finalizeAndGenerateReport(
        session.id,
        currentUser,
        'Full Metrological Verification Approved. All errors within Table 6 limits.'
      );
      onViewReport(report.id);
    } catch (e) {
      console.error('Failed to finalize report:', e);
    } finally {
      setIsFinalizing(false);
    }
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
    <div id="test-session-workflow" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft size={16} /> Back to Sessions
        </button>

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
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors w-full sm:w-auto"
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
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              <FileCheck size={15} />
              {isFinalizing ? 'Sealing Report...' : 'Approve & Seal Official Report'}
            </button>
          )}

          {matchedReport && (
            <button
              id="btn-view-generated-report"
              onClick={() => onViewReport(matchedReport.id)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors w-full sm:w-auto"
            >
              <FileCheck size={15} />
              View Sealed Report
            </button>
          )}
        </div>
      </div>

      {/* Session Metadata Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                {session.testSessionNumber}
              </span>
              <h2 className="text-base font-bold text-slate-900 truncate">
                {inst.manufacturer} {inst.model}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Class {inst.accuracyClass.replace('CLASS_', '')}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Serial No: <strong className="text-slate-800 font-mono">{inst.serialNumber}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span>Standard: <strong className="text-slate-800 font-mono">{session.standardEdition}</strong></span>
              <span className="hidden sm:inline">•</span>
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

          <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-between sm:justify-end">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Session State</span>
              <StatusBadge status={session.status} size="md" />
            </div>
            <div className="text-right pl-3 border-l border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Compliance</span>
              <ComplianceBadge status={session.overallCompliance} size="md" />
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-3 overflow-x-auto pb-1">
          {[
            { id: 'weighing', label: '1. Weighing Performance', icon: Scale, count: session.weighingObservations?.length || 0 },
            { id: 'repeatability', label: '2. Repeatability (ΔI)', icon: Activity, count: session.repeatabilitySeries?.length || 0 },
            { id: 'eccentricity', label: '3. Eccentricity', icon: Layers, count: session.eccentricityObservations?.length || 0 },
            { id: 'zerotare', label: '4. Zero & Tare', icon: ShieldCheck },
            { id: 'environmental', label: '5. Environmental Span', icon: Thermometer },
            { id: 'review', label: '6. Compliance Audit & Decision', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeWorkflowTab === tab.id;
            const comp = getTabCompliance(tab.id);
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
        {activeWorkflowTab === 'weighing' && (
          <WeighingTestTab
            session={session}
            isReadOnly={isReadOnly}
            onUpdateObservations={(weighingObservations) => saveUpdatedSession({ weighingObservations })}
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
          />
        )}

        {activeWorkflowTab === 'review' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Legal Metrology Compliance Determination</h3>
                <p className="text-xs text-slate-500">
                  Automated 3-state evaluation under OIML R 76-1:2006
                </p>
              </div>
              <ComplianceBadge status={session.overallCompliance} size="lg" />
            </div>

            {/* Test Plan & Compliance Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <ListChecks size={15} className="text-indigo-600" />
                Prescribed Verification Plan Matrix
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {session.testPlan.map((planItem, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{planItem.name}</span>
                        {planItem.isMandatory && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            MANDATORY
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">{planItem.clauseRef}</span>
                      {planItem.reasonForInapplicability && (
                        <p className="text-[11px] text-slate-400 italic">{planItem.reasonForInapplicability}</p>
                      )}
                    </div>
                    <ComplianceBadge status={planItem.compliance} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Notes */}
            {session.complianceSummary && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-800 block">Metrology Officer Assessment:</span>
                <p className="text-slate-600">
                  {session.complianceSummary.summaryNotes || 'All test modules evaluated against OIML Table 6 limits.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
