import React, { useState } from 'react';
import { TestReport } from '../../types/report';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import { FileText, Search, Download, Eye, ShieldCheck, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { EmptyState } from '../common/EmptyState';
import { generateTestReportPDF } from '../../services/export/pdfExport';
import { generateTestReportDOCX } from '../../services/export/docxExport';

interface Props {
  onSelectReport: (reportId: string) => void;
}

export const ReportList: React.FC<Props> = ({ onSelectReport }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('ALL');

  const lab = db.getLaboratory('LAB-IND-001')!;
  const reports = db.getReports();

  const filtered = reports.filter((r) => {
    const matchesSearch =
      r.reportNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instrumentSnapshot.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instrumentSnapshot.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instrumentSnapshot.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reviewerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult = resultFilter === 'ALL' || r.overallCompliance === resultFilter;

    return matchesSearch && matchesResult;
  });

  return (
    <div id="reports-list-view" className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText size={22} className="text-emerald-600" />
            Legal Metrology Reports Archive
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident, sealed test reports with SHA-256 digital integrity verification
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search report #, instrument, reviewer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Result:</span>
          {['ALL', 'PASS', 'FAIL', 'NOT_EVALUATED'].map((res) => (
            <button
              key={res}
              onClick={() => setResultFilter(res)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                resultFilter === res
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {res === 'ALL' ? 'All Results' : res}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No sealed reports found"
          description="Reports are generated upon completion and approval of a verification test session."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-5">Report No & Rev</th>
                  <th className="p-3.5">Instrument Verified</th>
                  <th className="p-3.5">Accuracy Class</th>
                  <th className="p-3.5">Result</th>
                  <th className="p-3.5">Reviewer & Date</th>
                  <th className="p-3.5 text-right pr-5">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rpt) => (
                  <tr
                    key={rpt.id}
                    onClick={() => onSelectReport(rpt.id)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5 pl-5">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {rpt.reportNumber}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Rev {rpt.currentRevision}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">
                        {rpt.instrumentSnapshot.manufacturer} {rpt.instrumentSnapshot.model}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">SN: {rpt.instrumentSnapshot.serialNumber}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-700">
                        Class {rpt.instrumentSnapshot.accuracyClass.replace('CLASS_', '')}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <ComplianceBadge status={rpt.overallCompliance} size="sm" />
                    </td>

                    <td className="p-3.5 text-slate-500">
                      <div className="font-medium text-slate-800">{rpt.reviewerName}</div>
                      <div className="text-[11px] text-slate-400">{new Date(rpt.generatedAt).toLocaleDateString()}</div>
                    </td>

                    <td className="p-3.5 pr-5 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateTestReportPDF(rpt, lab);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors"
                        title="Download PDF"
                      >
                        <Download size={13} />
                        PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateTestReportDOCX(rpt, lab);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors"
                        title="Download Word (DOCX)"
                      >
                        <Download size={13} />
                        DOCX
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
