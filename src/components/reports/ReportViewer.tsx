import React, { useState } from 'react';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import {
  ArrowLeft,
  Download,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  History,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { generateTestReportPDF } from '../../services/export/pdfExport';
import { generateTestReportDOCX } from '../../services/export/docxExport';

interface Props {
  reportId: string;
  onBack: () => void;
}

export const ReportViewer: React.FC<Props> = ({ reportId, onBack }) => {
  const lab = db.getLaboratory('LAB-IND-001')!;
  const report = db.getReport(reportId);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">Report document not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs">
          Return to Reports
        </button>
      </div>
    );
  }

  const inst = report.instrumentSnapshot;
  const session = report.testSessionSnapshot;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(report.sha256IntegrityHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div id="report-viewer-container" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft size={16} /> Back to Archive
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => generateTestReportDOCX(report, lab)}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors"
          >
            <Download size={14} /> Export Word (.DOCX)
          </button>
          <button
            onClick={() => generateTestReportPDF(report, lab)}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Download size={14} /> Download Official PDF
          </button>
        </div>
      </div>

      {/* Official Report Document Paper Canvas */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Document Header Header */}
        <div className="p-4 sm:p-6 md:p-8 bg-slate-900 text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block">
                {lab.name}
              </span>
              <h1 className="text-base sm:text-xl font-bold text-slate-100 tracking-tight mt-0.5">
                LEGAL METROLOGY NAWI VERIFICATION REPORT
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Standard: <strong className="text-slate-200">{report.standardEdition}</strong> | Accreditation: {lab.accreditationNumber}
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-1">
              <div>
                <span className="text-slate-400">Report No: </span>
                <span className="font-bold text-white">{report.reportNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">Revision: </span>
                <span className="font-bold text-indigo-300">Rev {report.currentRevision}</span>
              </div>
              <div>
                <span className="text-slate-400">Date: </span>
                <span className="text-slate-200">{new Date(report.generatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 text-xs text-slate-800">
          {/* Section 1: Instrument Under Test */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3">
              1. Instrument Under Test (IUT) Specifications
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Manufacturer & Model:</span>
                <span className="font-bold text-slate-900">{inst.manufacturer} {inst.model}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Serial Number:</span>
                <span className="font-mono font-bold text-slate-900">{inst.serialNumber}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Accuracy Class:</span>
                <span className="font-bold text-indigo-900">Class {inst.accuracyClass.replace('CLASS_', '')}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Maximum Capacity (Max):</span>
                <span className="font-mono font-bold text-slate-900">{inst.maxCapacity} {inst.unit}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Minimum Capacity (Min):</span>
                <span className="font-mono font-bold text-slate-900">{inst.minCapacity} {inst.unit}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Verification Interval (e):</span>
                <span className="font-mono font-bold text-slate-900">{inst.verificationScaleInterval} {inst.unit} (n = {inst.numberOfIntervals.toLocaleString()})</span>
              </div>
            </div>
          </div>

          {/* Section 2: Weighing Performance Results */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3">
              2. Weighing Performance Test Results (Clause 3.5.1)
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5 pl-4">#</th>
                      <th className="p-2.5">Dir</th>
                      <th className="p-2.5">Load ($L$)</th>
                      <th className="p-2.5">Indication ($I$)</th>
                      <th className="p-2.5">$\Delta L$</th>
                      <th className="p-2.5">Error ($E_c$)</th>
                      <th className="p-2.5">MPE Limit</th>
                      <th className="p-2.5 pr-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {session.weighingObservations?.map((obs) => (
                      <tr key={obs.testPointIndex}>
                        <td className="p-2.5 pl-4 text-slate-500">{obs.testPointIndex}</td>
                        <td className="p-2.5 font-sans font-medium">{obs.direction === 'ASCENDING' ? '↑ Asc' : '↓ Desc'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{obs.nominalLoad} {inst.unit}</td>
                        <td className="p-2.5 text-slate-800">{obs.indicatedValue} {inst.unit}</td>
                        <td className="p-2.5 text-slate-600">{obs.turningPointDeltaL ?? '-'}</td>
                        <td className="p-2.5 font-bold">
                          {obs.correctedErrorEc !== undefined ? (
                            <span className={obs.compliance === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>
                              {obs.correctedErrorEc > 0 ? `+${obs.correctedErrorEc.toFixed(4)}` : obs.correctedErrorEc.toFixed(4)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : `±${obs.mpeE}e`}
                        </td>
                        <td className="p-2.5 pr-4 text-right">
                          <ComplianceBadge status={obs.compliance} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Final Compliance Determination Statement */}
          <div
            className={`p-6 rounded-xl border ${
              report.overallCompliance === 'PASS'
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/70 border-rose-300 text-rose-950'
            } space-y-2`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight">
                LEGAL METROLOGY DETERMINATION: {report.overallCompliance}
              </h3>
              <ComplianceBadge status={report.overallCompliance} size="lg" />
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {report.complianceStatement}
            </p>
          </div>

          {/* Section 4: Sign-off & Digital Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Testing Technician
              </span>
              <p className="font-bold text-slate-900">{report.technicianName}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Timestamp: {new Date(report.technicianSignedAt || report.generatedAt).toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                <CheckCircle2 size={11} /> Digitally Signed
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Authorized Reviewer / Metrology Officer
              </span>
              <p className="font-bold text-slate-900">{report.reviewerName}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Approval Date: {new Date(report.reviewerSignedAt || report.generatedAt).toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                <ShieldCheck size={11} /> Approved & Sealed
              </span>
            </div>
          </div>

          {/* Section 5: Cryptographic Integrity Seal */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} /> SHA-256 Document Integrity Hash
              </span>
              <p className="font-mono text-xs text-slate-300 break-all">{report.sha256IntegrityHash}</p>
            </div>

            <button
              onClick={handleCopyHash}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 transition-colors shrink-0 text-slate-200"
            >
              {copiedHash ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
