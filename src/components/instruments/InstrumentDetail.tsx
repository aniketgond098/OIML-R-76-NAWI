import React, { useState } from 'react';
import { Instrument } from '../../types/instrument';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import {
  Scale,
  Play,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  Download,
  AlertTriangle,
  History,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { generateTestReportPDF } from '../../services/export/pdfExport';

interface Props {
  instrumentId: string;
  onBack: () => void;
  onStartNewTest: (instrumentId: string) => void;
  onSelectTestSession: (id: string) => void;
  onSelectReport: (id: string) => void;
}

export const InstrumentDetail: React.FC<Props> = ({
  instrumentId,
  onBack,
  onStartNewTest,
  onSelectTestSession,
  onSelectReport,
}) => {
  const { canCreateInstrument } = useAuth();
  const lab = db.getLaboratory('LAB-IND-001')!;

  const inst = db.getInstrument(instrumentId);
  const testSessions = db.getTestSessionsForInstrument(instrumentId);
  const reports = db.getReportsForInstrument(instrumentId);

  const [activeTab, setActiveTab] = useState<'specs' | 'tests' | 'reports' | 'components'>('specs');

  if (!inst) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Instrument record not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
          Return to List
        </button>
      </div>
    );
  }

  return (
    <div id="instrument-detail-view" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          id="btn-back-to-instruments"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft size={16} /> Back to Instruments
        </button>

        <div className="flex items-center gap-2.5">
          <button
            id="detail-start-test-btn"
            onClick={() => onStartNewTest(inst.id)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Play size={15} /> Start New Test Session
          </button>
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{inst.manufacturer} {inst.model}</h2>
              <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                Class {inst.accuracyClass.replace('CLASS_', '')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Serial No: <strong className="text-slate-800 font-mono">{inst.serialNumber}</strong></span>
              <span>•</span>
              <span>Tag ID: <strong className="text-slate-800 font-mono">{inst.instrumentIdTag}</strong></span>
              <span>•</span>
              <span>Type: <strong className="text-slate-800">{inst.instrumentType}</strong></span>
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6">
            <span className="text-xs text-slate-400 block font-medium">Metrological Capacity</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {inst.maxCapacity} {inst.unit}
            </span>
            <span className="text-[11px] text-slate-500 block">e = {inst.verificationScaleInterval} {inst.unit}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          {[
            { id: 'specs', label: 'Technical Specs' },
            { id: 'tests', label: `Test Sessions (${testSessions.length})` },
            { id: 'reports', label: `Official Reports (${reports.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Technical Specifications Matrix */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metrological Parameters */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Scale size={15} className="text-indigo-600" />
              Metrological Parameters (OIML Table 3)
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Accuracy Class</span>
                <span className="font-bold text-slate-900">Class {inst.accuracyClass.replace('CLASS_', '')}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Verification Scale Interval (e)</span>
                <span className="font-mono font-bold text-slate-900">{inst.verificationScaleInterval} {inst.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Actual Scale Interval (d)</span>
                <span className="font-mono font-bold text-slate-900">{inst.actualScaleInterval} {inst.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Verification Intervals (n = Max/e)</span>
                <span className="font-mono font-bold text-slate-900">{inst.numberOfIntervals.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Maximum Capacity (Max)</span>
                <span className="font-mono font-bold text-slate-900">{inst.maxCapacity} {inst.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Minimum Capacity (Min)</span>
                <span className="font-mono font-bold text-slate-900">{inst.minCapacity} {inst.unit}</span>
              </div>
            </div>
          </div>

          {/* Platform & Electronics */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Layers size={15} className="text-indigo-600" />
              Receptor, Platform & Electronics
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Load Receptor Type</span>
                <span className="font-semibold text-slate-900">{inst.loadReceptorType}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Points of Support (N)</span>
                <span className="font-mono font-semibold text-slate-900">{inst.numberOfSupportPoints}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Tare Device</span>
                <span className="font-semibold text-slate-900">{inst.tareType || 'Subtractive'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Software / Firmware</span>
                <span className="font-mono font-semibold text-slate-900">{inst.softwareVersion}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Operating Temperature</span>
                <span className="font-mono font-semibold text-slate-900">
                  {inst.operatingTemperatureMin}°C to {inst.operatingTemperatureMax}°C
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 block text-[11px]">Power Supply</span>
                <span className="font-semibold text-slate-900">{inst.powerSupply}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Test Sessions History */}
      {activeTab === 'tests' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Recorded Physical Test Sessions
          </div>
          <div className="divide-y divide-slate-100">
            {testSessions.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No test sessions recorded for this instrument yet.</p>
            ) : (
              testSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectTestSession(s.id)}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {s.testSessionNumber}
                      </span>
                      <StatusBadge status={s.status} size="sm" />
                      <ComplianceBadge status={s.overallCompliance} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Technician: {s.technicianName} | Started: {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-indigo-600 font-semibold group-hover:underline">Open Session →</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Official Reports Archive */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Finalized Legal Metrology Verification Reports
          </div>
          <div className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No finalized reports generated for this instrument yet.</p>
            ) : (
              reports.map((rpt) => (
                <div key={rpt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div onClick={() => onSelectReport(rpt.id)} className="space-y-1 cursor-pointer flex-1 group">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {rpt.reportNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        Rev {rpt.currentRevision}
                      </span>
                      <ComplianceBadge status={rpt.overallCompliance} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Reviewer: {rpt.reviewerName} | Issued: {new Date(rpt.generatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => generateTestReportPDF(rpt, lab)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Download PDF Report"
                  >
                    <Download size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
