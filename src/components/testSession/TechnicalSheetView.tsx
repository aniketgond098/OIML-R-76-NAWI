import React, { useState } from 'react';
import { TestSession } from '../../types/testSession';
import { db } from '../../services/storage/database';
import { generateWorksheetPDF } from '../../services/export/pdfExport';
import { WeighWiseLogo } from '../common/WeighWiseLogo';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Printer,
  ShieldCheck,
  Scale,
  Cpu,
  Wrench,
  Clock,
  FileText,
  Download,
  Info,
  Check,
  Loader2,
} from 'lucide-react';

interface Props {
  session: TestSession;
  onJumpToTest: (testId: string) => void;
  onPrint?: () => void;
}

export const TechnicalSheetView: React.FC<Props> = ({ session, onJumpToTest, onPrint }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const lab = (session.laboratoryId && db.getLaboratory(session.laboratoryId)) || db.getLaboratory('LAB-IND-001') || db.getLaboratories()[0];

  const inst = session.instrumentSnapshot;
  const envReading = session.environmentalReadings?.[0];
  const temperature = envReading?.temperatureC ?? 20.0;
  const humidity = envReading?.relativeHumidityPercent ?? 50.0;
  const pressure = envReading?.atmosphericPressureHPa ?? 1013.25;

  const weighingObs = session.weighingObservations || [];
  const eccObs = session.eccentricityObservations || [];
  const repSeries = session.repeatabilitySeries || [];
  const creepObs = session.creepObservation;
  const qc = session.additionalQCChecks;

  // Determine overall section pass/fail
  const weighingPass = weighingObs.length > 0 && weighingObs.every((o) => o.compliance === 'PASS');
  const eccPass = eccObs.length > 0 && eccObs.every((o) => o.compliance === 'PASS');
  const repPass = repSeries.length > 0 && repSeries.every((s) => s.compliance === 'PASS');
  const creepPass = creepObs ? creepObs.compliance === 'PASS' : true;
  const qcPass = qc ? qc.overallQcStatus === 'PASS' : true;

  const allMetrologyPass = weighingPass && eccPass && repPass && creepPass;

  const handleDownloadPDF = () => {
    try {
      setIsProcessing(true);
      generateWorksheetPDF(session, lab);
      setNotification({
        type: 'success',
        message: 'Official Technical Worksheet PDF downloaded successfully.',
      });
      setTimeout(() => setNotification(null), 4500);
    } catch (err) {
      console.error('Worksheet PDF export failed:', err);
      setNotification({
        type: 'error',
        message: 'Failed to generate PDF. Please try again.',
      });
      setTimeout(() => setNotification(null), 4500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    setIsProcessing(true);

    if (onPrint) {
      try {
        onPrint();
        setIsProcessing(false);
        return;
      } catch (err) {
        console.warn('Custom onPrint error:', err);
      }
    }

    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    if (isInIframe) {
      try {
        generateWorksheetPDF(session, lab);
        setNotification({
          type: 'success',
          message: 'Worksheet PDF downloaded! (In the live preview iframe, direct print dialogs are blocked by browser sandbox policy. You can print the downloaded PDF directly or open the app in a new tab).',
        });
        setTimeout(() => setNotification(null), 6000);
      } catch (err) {
        console.error('PDF export error:', err);
        setNotification({
          type: 'error',
          message: 'Could not export worksheet PDF.',
        });
        setTimeout(() => setNotification(null), 4000);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    try {
      window.print();
      setNotification({
        type: 'info',
        message: 'Print dialog opened.',
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err) {
      console.warn('window.print() error, falling back to PDF:', err);
      generateWorksheetPDF(session, lab);
      setNotification({
        type: 'success',
        message: 'Browser print dialog was restricted. Worksheet PDF downloaded automatically.',
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Notification Toast Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200 print:hidden ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-900'
              : 'bg-indigo-50 border border-indigo-300 text-indigo-900'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : notification.type === 'error' ? (
            <XCircle size={16} className="text-rose-600 shrink-0" />
          ) : (
            <Info size={16} className="text-indigo-600 shrink-0" />
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}

      {/* Top Banner with Print / Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              Laboratory Technical Worksheet
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium font-mono">{session.id}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Technical Metrology & QC Inspection Sheet
          </h2>
          <p className="text-xs text-slate-500">
            Consolidated matrix view according to OIML R 76-1 and laboratory quality standards
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            id="btn-download-worksheet-pdf"
            disabled={isProcessing}
            onClick={handleDownloadPDF}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            id="btn-print-worksheet"
            disabled={isProcessing}
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Printer size={14} />
            <span>Print Worksheet</span>
          </button>

          <div
            className={`px-3 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 ${
              allMetrologyPass
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {allMetrologyPass ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{allMetrologyPass ? 'OIML COMPLIANT' : 'NON-COMPLIANT'}</span>
          </div>
        </div>
      </div>

      {/* Sheet Frame (Styled like a professional QA Laboratory Form) */}
      <div
        id="technical-sheet-canvas"
        className="bg-white border-2 border-slate-300 rounded-2xl shadow-sm overflow-hidden text-slate-900 font-sans print:border-black print:rounded-none"
      >
        {/* Header Block: Instrument & Laboratory Metadata */}
        <div className="border-b-2 border-slate-300 bg-slate-50/70 p-5">
          {/* Official Document Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-200 gap-2">
            <WeighWiseLogo variant="horizontal" size="sm" showSubtitle={true} />
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
                Standard Test Record • Form OIML-R76-WS
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                Session: {session.id}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            {/* Column 1: Instrument Spec */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Instrument Identification
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {inst.manufacturer} {inst.model}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                S/N: <strong className="text-slate-900">{inst.serialNumber}</strong>
              </div>
              <div className="text-slate-600 text-[11px]">
                Class: <strong className="text-indigo-600 uppercase font-bold">{inst.accuracyClass}</strong>
              </div>
            </div>

            {/* Column 2: Metrological Parameters */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Metrological Limits
              </span>
              <div className="text-slate-700">
                Max Capacity:{' '}
                <strong className="font-mono text-slate-900">
                  {inst.maxCapacity} {inst.unit}
                </strong>
              </div>
              <div className="text-slate-700">
                Min Capacity:{' '}
                <strong className="font-mono text-slate-900">
                  {inst.minCapacity} {inst.unit}
                </strong>
              </div>
              <div className="text-slate-700">
                Scale Interval: <strong className="font-mono text-slate-900">e = {inst.verificationScaleInterval} {inst.unit}</strong>{' '}
                <span className="text-slate-500 text-[10px]">(d = {inst.actualScaleInterval})</span>
              </div>
            </div>

            {/* Column 3: Ambient Conditions */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Environmental Conditions
              </span>
              <div className="text-slate-700">
                Temperature:{' '}
                <strong className="font-mono text-slate-900">{temperature.toFixed(1)}°C</strong>
              </div>
              <div className="text-slate-700">
                Relative Humidity:{' '}
                <strong className="font-mono text-slate-900">{humidity.toFixed(1)}%</strong>
              </div>
              <div className="text-slate-700">
                Barometric Pressure:{' '}
                <strong className="font-mono text-slate-900">{pressure.toFixed(1)} hPa</strong>
              </div>
            </div>

            {/* Column 4: Verification Context */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Test Authority & Session
              </span>
              <div className="text-slate-700">
                Inspector: <strong className="text-slate-900">{session.technicianName}</strong>
              </div>
              <div className="text-slate-700">
                Date: <strong className="text-slate-900">{new Date(session.createdAt).toLocaleDateString()}</strong>
              </div>
              <div className="text-slate-700">
                Status: <span className="font-mono uppercase font-bold text-indigo-700">{session.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y-2 divide-slate-200">
          {/* Section 1: Weighing Performance (Linearity) */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Weighing Performance & Linearity (OIML R 76-1 Clause 3.5.1 / A.4.4)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    weighingPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {weighingPass ? 'PASS' : 'FAIL / INCOMPLETE'}
                </span>
                <button
                  onClick={() => onJumpToTest('test-weighing')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2 print:hidden"
                >
                  <span>Edit</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {weighingObs.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Nominal Load (L)</th>
                      <th className="py-2 px-3">Indication (I)</th>
                      <th className="py-2 px-3">Calc Indication (P)</th>
                      <th className="py-2 px-3">Error (Ec)</th>
                      <th className="py-2 px-3">MPE Limit</th>
                      <th className="py-2 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {weighingObs.map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold">{pt.nominalLoad} {inst.unit}</td>
                        <td className="py-2 px-3">{pt.indicatedValue} {inst.unit}</td>
                        <td className="py-2 px-3">{pt.calculatedIndicationP != null ? pt.calculatedIndicationP.toFixed(3) : '-'}</td>
                        <td className="py-2 px-3 font-bold">{pt.correctedErrorEc != null ? `${pt.correctedErrorEc.toFixed(4)} ${inst.unit}` : '-'}</td>
                        <td className="py-2 px-3">{pt.mpeInUnit != null ? `±${pt.mpeInUnit.toFixed(4)} ${inst.unit}` : '-'}</td>
                        <td className="py-2 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              pt.compliance === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pt.compliance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No weighing test data recorded yet.{' '}
                <button
                  onClick={() => onJumpToTest('test-weighing')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Start Weighing Test
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Eccentricity / Off-Centre Load */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Eccentricity / Off-Centre Loading (OIML R 76-1 Clause 3.6.2 / A.4.7)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    eccPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {eccPass ? 'PASS' : 'FAIL / INCOMPLETE'}
                </span>
                <button
                  onClick={() => onJumpToTest('test-eccentricity')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2 print:hidden"
                >
                  <span>Edit</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {eccObs.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Position</th>
                      <th className="py-2 px-3">Test Load</th>
                      <th className="py-2 px-3">Indication</th>
                      <th className="py-2 px-3">Error (Ec)</th>
                      <th className="py-2 px-3">MPE Limit</th>
                      <th className="py-2 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {eccObs.map((obs) => (
                      <tr key={obs.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-bold">{obs.positionName}</td>
                        <td className="py-2 px-3">{obs.nominalLoad} {inst.unit}</td>
                        <td className="py-2 px-3 font-bold">{obs.indicatedValue} {inst.unit}</td>
                        <td className="py-2 px-3">{obs.correctedErrorEc != null ? `${obs.correctedErrorEc.toFixed(4)} ${inst.unit}` : '-'}</td>
                        <td className="py-2 px-3">{obs.mpeInUnit != null ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : '-'}</td>
                        <td className="py-2 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              obs.compliance === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {obs.compliance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No eccentricity test data recorded yet.{' '}
                <button
                  onClick={() => onJumpToTest('test-eccentricity')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Start Eccentricity Test
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Repeatability */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Repeatability (OIML R 76-1 Clause 3.6.1 / A.4.5)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    repPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {repPass ? 'PASS' : 'FAIL / INCOMPLETE'}
                </span>
                <button
                  onClick={() => onJumpToTest('test-repeatability')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2 print:hidden"
                >
                  <span>Edit</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {repSeries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {repSeries.map((s) => (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-800">
                        Series {s.seriesNumber}: {s.nominalLoad} {inst.unit}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                          s.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.compliance}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px] text-slate-600">
                      <div>
                        Readings:{' '}
                        <strong className="text-slate-900">
                          {s.readings.map((r) => r.indicatedValue).join(', ')} {inst.unit}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Difference (ΔI):</span>
                        <strong className="text-slate-900">{s.deltaI != null ? `${s.deltaI.toFixed(4)} ${inst.unit}` : '-'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>MPE Limit:</span>
                        <span>{s.mpeInUnit != null ? `≤ ${s.mpeInUnit.toFixed(4)} ${inst.unit}` : '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                No repeatability test data recorded yet.{' '}
                <button
                  onClick={() => onJumpToTest('test-repeatability')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Start Repeatability Test
                </button>
              </div>
            )}
          </div>

          {/* Section 4: Creep Test (if present) */}
          {creepObs && (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    4. Creep Test (OIML R 76-1 Clause 3.9.4.1 / A.4.8.1)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      creepPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {creepPass ? 'PASS' : 'FAIL'}
                  </span>
                  <button
                    onClick={() => onJumpToTest('test-creep')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2 print:hidden"
                  >
                    <span>Edit</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-sans block">Nominal Load</span>
                  <strong className="text-slate-900">{creepObs.nominalLoad} {inst.unit}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-sans block">Total Creep (ΔI)</span>
                  <strong className="text-slate-900">{creepObs.driftValue != null ? `${creepObs.driftValue.toFixed(4)} ${inst.unit}` : '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-sans block">MPE Limit (0.5e)</span>
                  <span className="text-slate-700">{creepObs.maxPermissibleDrift != null ? `≤ ${creepObs.maxPermissibleDrift.toFixed(4)} ${inst.unit}` : '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-sans block">Duration</span>
                  <span className="text-slate-700 font-sans">{creepObs.testDurationSeconds ?? 0} seconds</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Additional Laboratory / Manufacturer QC Checks */}
          <div className="p-5 space-y-3 bg-blue-50/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Supplementary: Laboratory / Manufacturer QC Checks
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  Non-OIML
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    qcPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {qc?.overallQcStatus ?? 'PENDING'}
                </span>
                <button
                  onClick={() => onJumpToTest('test-additional-qc')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-2 print:hidden"
                >
                  <span>Edit</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {qc ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Leveling Bubble:</span>
                    <strong className="text-slate-800">{qc.levelingBubbleCentered ? '✓ Centered' : '✗ Off-center'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Platter Seating:</span>
                    <strong className="text-slate-800">{qc.platterStabilitySecure ? '✓ Secure' : '✗ Loose'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Seals / Marks:</span>
                    <strong className="text-slate-800">{qc.sealingMarksIntact ? '✓ Intact' : '✗ Tampered'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Zero ADC Count:</span>
                    <strong className="font-mono text-slate-800">{qc.rawAdcZeroCount != null ? qc.rawAdcZeroCount.toLocaleString() : '-'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Span ADC Count:</span>
                    <strong className="font-mono text-slate-800">{qc.rawAdcSpanCount != null ? qc.rawAdcSpanCount.toLocaleString() : '-'}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 text-[10px] block">Excitation Voltage:</span>
                    <strong className="font-mono text-slate-800">{qc.excitationVoltageV != null ? `${qc.excitationVoltageV.toFixed(2)} V` : '-'}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">QA Remarks:</span>
                    <p className="text-slate-800 italic">{qc.qcNotes || 'None recorded.'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 block text-[11px]">Signed By:</span>
                    <strong className="text-slate-900">{qc.qcInspectorName}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Supplementary manufacturer checks have not been recorded.{' '}
                <button
                  onClick={() => onJumpToTest('test-additional-qc')}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  Perform Laboratory QC Checks
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Worksheet Sign-Off Footer */}
        <div className="p-5 bg-slate-50/80 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-slate-800">
              Laboratory Verification Sign-off & Audit Record
            </div>
            <div className="text-slate-500 text-[11px]">
              Session Hash: <span className="font-mono">{session.id.slice(0, 16)}</span> • Verified per OIML R 76-1 Edition 2006 (E)
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-[11px]">Verification Technician:</div>
            <div className="font-bold text-slate-900 font-mono text-sm">{session.technicianName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
