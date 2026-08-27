import React from 'react';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import {
  Scale,
  ClipboardCheck,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { generateTestReportPDF } from '../../services/export/pdfExport';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface Props {
  onNavigateToInstruments: () => void;
  onNavigateToNewInstrument: () => void;
  onNavigateToTestSessions: () => void;
  onNavigateToReports: () => void;
  onSelectTestSession: (id: string) => void;
  onSelectReport: (id: string) => void;
}

export const DashboardView: React.FC<Props> = ({
  onNavigateToInstruments,
  onNavigateToNewInstrument,
  onNavigateToTestSessions,
  onNavigateToReports,
  onSelectTestSession,
  onSelectReport,
}) => {
  const { currentUser, canCreateInstrument } = useAuth();
  const lab = db.getLaboratory('LAB-IND-001')!;

  const instruments = db.getInstruments();
  const testSessions = db.getTestSessions();
  const reports = db.getReports();

  // Metrics computation
  const totalInstruments = instruments.length;
  const inProgressTests = testSessions.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'DRAFT').length;
  const pendingReviewTests = testSessions.filter((s) => s.status === 'UNDER_REVIEW' || s.status === 'COMPLETED').length;
  const reportsCount = reports.length;

  const passedTests = testSessions.filter((s) => s.overallCompliance === 'PASS').length;
  const failedTests = testSessions.filter((s) => s.overallCompliance === 'FAIL').length;
  const notEvaluatedTests = testSessions.filter((s) => s.overallCompliance === 'NOT_EVALUATED').length;

  // Chart Data
  const statusChartData = [
    { name: 'Draft', count: testSessions.filter((s) => s.status === 'DRAFT').length, color: '#94a3b8' },
    { name: 'In Progress', count: testSessions.filter((s) => s.status === 'IN_PROGRESS').length, color: '#3b82f6' },
    { name: 'Under Review', count: testSessions.filter((s) => s.status === 'UNDER_REVIEW').length, color: '#a855f7' },
    { name: 'Report Sealed', count: testSessions.filter((s) => s.status === 'REPORT_GENERATED').length, color: '#4f46e5' },
  ];

  const complianceChartData = [
    { name: 'PASS', value: passedTests || 1, color: '#10b981' },
    { name: 'FAIL', value: failedTests || 0, color: '#ef4444' },
    { name: 'NOT EVAL', value: notEvaluatedTests || 0, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  const recentTests = testSessions.slice(0, 5);
  const recentReports = reports.slice(0, 4);

  return (
    <div id="dashboard-view" className="p-6 space-y-6 max-w-7xl">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Legal Metrology Control Center</h2>
            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 rounded-md">
              ISO/IEC 17025 Compliant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{currentUser.fullName}</strong> ({currentUser.designation})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canCreateInstrument && (
            <button
              id="dashboard-new-inst-btn"
              onClick={onNavigateToNewInstrument}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus size={15} />
              Register Instrument
            </button>
          )}
          <button
            id="dashboard-all-tests-btn"
            onClick={onNavigateToTestSessions}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
          >
            <ClipboardCheck size={15} />
            Test Sessions
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={onNavigateToInstruments}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Instruments</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Scale size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalInstruments}</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Classes I, II, III & IIII</span>
          </div>
        </div>

        <div
          onClick={onNavigateToTestSessions}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In-Progress Testing</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">{inProgressTests}</span>
            <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">Active data entry</span>
          </div>
        </div>

        <div
          onClick={onNavigateToTestSessions}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Review</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">{pendingReviewTests}</span>
            <span className="text-[11px] text-purple-600 font-semibold block mt-0.5">Awaiting sign-off</span>
          </div>
        </div>

        <div
          onClick={onNavigateToReports}
          className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Reports Sealed</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FileCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 font-mono">{reportsCount}</span>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">SHA-256 verified</span>
          </div>
        </div>
      </div>

      {/* Compliance & Workflow Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Testing Lifecycle & Status */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Laboratory Test Sessions by Workflow Stage</h3>
              <p className="text-xs text-slate-500">Live operational distribution across lab testing pipeline</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 font-mono">{testSessions.length} Total Sessions</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Compliance Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Three-State Compliance</h3>
            <p className="text-xs text-slate-500">Rigorous OIML R-76 evaluation</p>
          </div>

          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={complianceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {complianceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="text-xs text-emerald-800 font-bold block">{passedTests}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">PASS</span>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg">
              <span className="text-xs text-rose-800 font-bold block">{failedTests}</span>
              <span className="text-[10px] text-rose-600 font-semibold">FAIL</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="text-xs text-amber-800 font-bold block">{notEvaluatedTests}</span>
              <span className="text-[10px] text-amber-700 font-semibold">NOT EVAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Test Sessions & Recent Finalized Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Test Sessions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Test Sessions</h3>
            </div>
            <button
              onClick={onNavigateToTestSessions}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTests.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No test sessions recorded yet.</p>
            ) : (
              recentTests.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectTestSession(session.id)}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {session.testSessionNumber}
                      </span>
                      <StatusBadge status={session.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500">
                      {session.instrumentSnapshot.manufacturer} {session.instrumentSnapshot.model} (SN: {session.instrumentSnapshot.serialNumber})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tech: {session.technicianName} | {new Date(session.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <ComplianceBadge status={session.overallCompliance} size="sm" />
                    <ArrowRight size={15} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Finalized Reports */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Sealed Test Reports</h3>
            </div>
            <button
              onClick={onNavigateToReports}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              View Repository <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentReports.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No finalized reports generated yet.</p>
            ) : (
              recentReports.map((rpt) => (
                <div
                  key={rpt.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between"
                >
                  <div
                    onClick={() => onSelectReport(rpt.id)}
                    className="space-y-1 cursor-pointer flex-1 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {rpt.reportNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        Rev {rpt.currentRevision}
                      </span>
                      <ComplianceBadge status={rpt.overallCompliance} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500">
                      {rpt.instrumentSnapshot.manufacturer} {rpt.instrumentSnapshot.model}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Reviewer: {rpt.reviewerName} | {new Date(rpt.generatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pl-3">
                    <button
                      onClick={() => generateTestReportPDF(rpt, lab)}
                      title="Download Official PDF Report"
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors border border-slate-200"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
