import React, { useState } from 'react';
import { db } from '../../services/storage/database';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { ComplianceBadge } from '../common/ComplianceBadge';
import { CalculationModal } from '../common/CalculationModal';
import { generateTestReportPDF } from '../../services/export/pdfExport';
import { generateTestReportDOCX } from '../../services/export/docxExport';
import { CalculationExplanation } from '../../types/metrology';
import { calculateWeighingError } from '../../metrology/calculations/weighing';
import { calculateRepeatability } from '../../metrology/calculations/repeatability';
import { calculateEccentricityPosition } from '../../metrology/calculations/eccentricity';
import { calculateZeroSetting } from '../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../metrology/calculations/tare';

interface Props {
  reportId: string;
  onBack: () => void;
}

export const ReportViewer: React.FC<Props> = ({ reportId, onBack }) => {
  const lab = db.getLaboratory('LAB-IND-001')!;
  const report = db.getReport(reportId);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<CalculationExplanation | null>(null);

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

  const handleInspectWeighingRow = (obs: any) => {
    const result = calculateWeighingError({
      nominalLoadL: obs.nominalLoad,
      indicatedValueI: obs.indicatedValue,
      verificationScaleIntervalE: inst.verificationScaleInterval || 1,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      turningPointDeltaL: obs.turningPointDeltaL,
      zeroErrorE0: session.zeroSettingObservation?.calculatedZeroErrorE0 || 0,
      isServiceVerification: session.verificationType === 'SUBSEQUENT_IN_SERVICE',
    });
    setActiveExplanation(result.explanation);
  };

  const handleInspectRepeatability = (rep: any) => {
    const result = calculateRepeatability({
      nominalLoadL: rep.nominalLoad,
      readings: rep.readings || [],
      verificationScaleIntervalE: inst.verificationScaleInterval || 1,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      isServiceVerification: session.verificationType === 'SUBSEQUENT_IN_SERVICE',
    });
    setActiveExplanation(result.explanation);
  };

  const handleInspectEccentricity = (eccList: any[]) => {
    const firstPoint = eccList[0];
    if (!firstPoint) return;
    const result = calculateEccentricityPosition({
      positionId: firstPoint.positionId ?? 1,
      positionName: firstPoint.positionName ?? 'Center',
      nominalLoadL: firstPoint.nominalLoad ?? (inst.maxCapacity / 3),
      indicatedValueI: firstPoint.indicatedValue ?? firstPoint.nominalLoad,
      turningPointDeltaL: firstPoint.turningPointDeltaL,
      zeroErrorE0: session.zeroSettingObservation?.calculatedZeroErrorE0 || 0,
      verificationScaleIntervalE: inst.verificationScaleInterval || 1,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      isServiceVerification: session.verificationType === 'SUBSEQUENT_IN_SERVICE',
    });
    setActiveExplanation(result.explanation);
  };

  const handleInspectZero = (z: any) => {
    const result = calculateZeroSetting({
      zeroIndicationI0: z.zeroIndication ?? 0,
      turningPointDeltaL0: z.turningPointDeltaL0 ?? 0,
      verificationScaleIntervalE: inst.verificationScaleInterval || 1,
      unit: inst.unit,
      maxCapacity: inst.maxCapacity,
    });
    setActiveExplanation(result.explanation);
  };

  const handleInspectTare = (t: any) => {
    const result = calculateTare({
      tareLoadAppliedT: t.tareLoadApplied ?? 0,
      indicatedTareI: t.indicatedTare ?? t.indicatedTareValue ?? t.tareLoadApplied ?? 0,
      turningPointDeltaLTare: t.turningPointDeltaLTare ?? 0,
      verificationScaleIntervalE: inst.verificationScaleInterval || 1,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      netTestPoints: t.netTestPoints || [],
    });
    setActiveExplanation(result.explanation);
  };

  const isPass = report.overallCompliance === 'PASS';
  const isFail = report.overallCompliance === 'FAIL';
  const isNotEvaluated = report.overallCompliance === 'NOT_EVALUATED';

  return (
    <div id="report-viewer-container" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Archive
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => generateTestReportDOCX(report, lab)}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Download size={14} /> Export Word (.DOCX)
          </button>
          <button
            onClick={() => generateTestReportPDF(report, lab)}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download size={14} /> Download Official PDF
          </button>
        </div>
      </div>

      {/* Demo Data Banner if applicable */}
      {report.isDemoData && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2.5 text-amber-800 text-xs">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <div>
            <strong className="font-bold">PROTOTYPE / DEMO LABORATORY DATA:</strong> This test report contains simulated data created for laboratory software demonstration and testing workflows.
          </div>
        </div>
      )}

      {/* Official Report Document Paper Canvas */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Document Header */}
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
                Standard: <strong className="text-slate-200">{report.standardEdition || 'OIML R 76-1:2006'}</strong> | RuleSet: <strong className="text-indigo-300">{report.ruleSetVersion || 'OIML-R76-2006-v1.0'}</strong> | Accreditation: {lab.accreditationNumber}
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
                <span className="font-bold text-indigo-900">Class {inst.accuracyClass.replace('CLASS_', '')} (OIML Table 3)</span>
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

          {/* Section 2: Ambient Test Conditions */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3">
              2. Ambient Test Conditions & Reference Standards
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Ambient Temperature:</span>
                <span className="font-mono font-bold text-slate-900">
                  {session.environmentalReadings?.[0]?.temperatureC ?? 20.0} °C
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Relative Humidity:</span>
                <span className="font-mono font-bold text-slate-900">
                  {session.environmentalReadings?.[0]?.relativeHumidityPercent ?? 50} % RH
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Reference Standard:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {report.equipmentSnapshots?.[0]?.name || 'Calibrated Standard Mass Set (OIML Class F1)'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Formal Compliance Matrix */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3 flex items-center justify-between">
              <span>3. Formal Compliance Matrix (OIML R 76-1:2006 Requirements)</span>
              <span className="text-[11px] font-normal text-slate-500">Edition: {report.standardEdition || 'OIML R 76-1:2006'}</span>
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5 pl-4">Test Module</th>
                      <th className="p-2.5">OIML Clause</th>
                      <th className="p-2.5">Prescribed Limit (MPE)</th>
                      <th className="p-2.5">Calculated Result</th>
                      <th className="p-2.5 pr-4 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {report.complianceMatrix && report.complianceMatrix.length > 0 ? (
                      report.complianceMatrix.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-4 font-sans font-medium text-slate-900">{item.testName}</td>
                          <td className="p-2.5 text-slate-600">{item.clauseRef}</td>
                          <td className="p-2.5 text-slate-600 font-sans">{item.mpeRequirement || '-'}</td>
                          <td className="p-2.5 font-bold text-slate-800">{item.calculatedError || item.summaryResult}</td>
                          <td className="p-2.5 pr-4 text-right">
                            <ComplianceBadge status={item.compliance} size="sm" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5 pl-4 font-sans font-medium text-slate-900">Weighing Performance Test</td>
                        <td className="p-2.5 text-slate-600">Clause 3.5.1, Table 6</td>
                        <td className="p-2.5 text-slate-600 font-sans">Table 6 MPE (±0.5e, ±1.0e, ±1.5e)</td>
                        <td className="p-2.5 font-bold text-slate-800">Evaluated</td>
                        <td className="p-2.5 pr-4 text-right">
                          <ComplianceBadge status={report.overallCompliance} size="sm" />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 4: Weighing Performance Observations Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3 flex items-center justify-between">
              <span>4. Weighing Performance Test Observations (Clause 3.5.1 & A.4.4.3)</span>
              <span className="text-[11px] font-normal text-slate-500 font-mono">Formula: P = I + 0.5e - ΔL, Ec = P - L - E0</span>
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                      <th className="p-2.5 pl-4">#</th>
                      <th className="p-2.5">Dir</th>
                      <th className="p-2.5">Load ($L$)</th>
                      <th className="p-2.5">Indication ($I$)</th>
                      <th className="p-2.5">Turning Point ($\Delta L$)</th>
                      <th className="p-2.5">Error ($E_c$)</th>
                      <th className="p-2.5">MPE Limit</th>
                      <th className="p-2.5 text-center">Traceability</th>
                      <th className="p-2.5 pr-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {session.weighingObservations?.map((obs) => (
                      <tr key={obs.testPointIndex} className="hover:bg-slate-50/50">
                        <td className="p-2.5 pl-4 text-slate-500">{obs.testPointIndex}</td>
                        <td className="p-2.5 font-sans font-medium">{obs.direction === 'ASCENDING' ? '↑ Asc' : '↓ Desc'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{obs.nominalLoad} {inst.unit}</td>
                        <td className="p-2.5 text-slate-800">{obs.indicatedValue} {inst.unit}</td>
                        <td className="p-2.5 text-slate-600">{obs.turningPointDeltaL !== undefined ? `${obs.turningPointDeltaL} ${inst.unit}` : '-'}</td>
                        <td className="p-2.5 font-bold">
                          {obs.correctedErrorEc !== undefined ? (
                            <span className={obs.compliance === 'PASS' ? 'text-emerald-700' : obs.compliance === 'FAIL' ? 'text-rose-700' : 'text-amber-700'}>
                              {obs.correctedErrorEc > 0 ? `+${obs.correctedErrorEc.toFixed(4)}` : obs.correctedErrorEc.toFixed(4)} {inst.unit}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : `±${obs.mpeE}e`}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleInspectWeighingRow(obs)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-sans font-semibold border border-indigo-200 transition-colors cursor-pointer"
                            title="Inspect mathematical derivation steps & rule reference"
                          >
                            <Calculator size={11} /> Trace
                          </button>
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

          {/* Section 5: Repeatability, Eccentricity, Zero & Tare Summaries */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200 mb-3">
              5. Repeatability, Eccentricity, Zero-Setting & Tare Modules
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Repeatability Card */}
              {session.repeatabilitySeries && session.repeatabilitySeries.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Repeatability (Clause 3.6.1)</span>
                    <ComplianceBadge status={session.repeatabilitySeries[0]?.compliance || 'NOT_EVALUATED'} size="sm" />
                  </div>
                  <p className="text-slate-600">
                    Load: <strong className="font-mono">{session.repeatabilitySeries[0]?.nominalLoad} {inst.unit}</strong> | Span ΔI: <strong className="font-mono text-slate-900">{session.repeatabilitySeries[0]?.deltaI?.toFixed(4)} {inst.unit}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono text-[11px]">|MPE| = {session.repeatabilitySeries[0]?.mpeInUnit?.toFixed(4)} {inst.unit}</span>
                    <button
                      onClick={() => handleInspectRepeatability(session.repeatabilitySeries[0])}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline cursor-pointer"
                    >
                      <Calculator size={11} /> View Calculation Proof
                    </button>
                  </div>
                </div>
              )}

              {/* Eccentricity Card */}
              {session.eccentricityObservations && session.eccentricityObservations.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Eccentric Loading (Clause 3.6.2)</span>
                    <ComplianceBadge status={session.eccentricityObservations[0]?.compliance || 'NOT_EVALUATED'} size="sm" />
                  </div>
                  <p className="text-slate-600">
                    Positions Tested: <strong className="font-mono">{session.eccentricityObservations.length}</strong> | Max Error: <strong className="font-mono text-slate-900">{Math.max(...session.eccentricityObservations.map((o) => Math.abs(o.correctedErrorEc))).toFixed(4)} {inst.unit}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono text-[11px]">MPE = ±{session.eccentricityObservations[0]?.mpeInUnit?.toFixed(4)} {inst.unit}</span>
                    <button
                      onClick={() => handleInspectEccentricity(session.eccentricityObservations)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline cursor-pointer"
                    >
                      <Calculator size={11} /> View Calculation Proof
                    </button>
                  </div>
                </div>
              )}

              {/* Zero-Setting Card */}
              {session.zeroSettingObservation && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Zero-Setting Accuracy (Clause 4.5.2)</span>
                    <ComplianceBadge status={session.zeroSettingObservation.compliance || 'PASS'} size="sm" />
                  </div>
                  <p className="text-slate-600">
                    Zero Error (E₀): <strong className="font-mono text-slate-900">{(session.zeroSettingObservation.calculatedZeroErrorE0 || 0).toFixed(5)} {inst.unit}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono text-[11px]">Limit: ±0.25 e (±{(0.25 * (inst.verificationScaleInterval || 1)).toFixed(5)} {inst.unit})</span>
                    <button
                      onClick={() => handleInspectZero(session.zeroSettingObservation)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline cursor-pointer"
                    >
                      <Calculator size={11} /> View Calculation Proof
                    </button>
                  </div>
                </div>
              )}

              {/* Tare Card */}
              {session.tareObservation && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Tare Mechanism (Clause 4.6.3)</span>
                    <ComplianceBadge status={session.tareObservation.compliance || 'PASS'} size="sm" />
                  </div>
                  <p className="text-slate-600">
                    Tare Error (Etare): <strong className="font-mono text-slate-900">{(session.tareObservation.calculatedTareError || 0).toFixed(5)} {inst.unit}</strong>
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-mono text-[11px]">Limit: ±0.25 e (±{(0.25 * (inst.verificationScaleInterval || 1)).toFixed(5)} {inst.unit})</span>
                    <button
                      onClick={() => handleInspectTare(session.tareObservation)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold hover:underline cursor-pointer"
                    >
                      <Calculator size={11} /> View Calculation Proof
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Final Compliance Determination Statement */}
          <div
            className={`p-6 rounded-xl border ${
              isPass
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                : isFail
                ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                : 'bg-amber-50/70 border-amber-300 text-amber-950'
            } space-y-2.5`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight">
                LEGAL METROLOGY DETERMINATION: {report.overallCompliance}
              </h3>
              <ComplianceBadge status={report.overallCompliance} size="lg" />
            </div>
            <p className="text-xs leading-relaxed font-sans text-slate-800">
              {report.complianceStatement}
            </p>
            {report.complianceReason && (
              <p className="text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200/60">
                Evaluation Basis: {report.complianceReason}
              </p>
            )}
          </div>

          {/* Section 7: Sign-off & Digital Signatures (Distinct Roles) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Testing Technician (Execution & Observations)
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
                Authorized Reviewer / Metrology Officer (Approval & Signoff)
              </span>
              <p className="font-bold text-slate-900">{report.reviewerName}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                Approval Date: {new Date(report.reviewerSignedAt || report.generatedAt).toLocaleString()}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                <ShieldCheck size={11} /> {report.approvalRecord?.status || 'APPROVED & SEALED'}
              </span>
            </div>
          </div>

          {/* Section 8: Cryptographic Integrity Seal */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} /> SHA-256 Document Integrity Hash
              </span>
              <p className="font-mono text-xs text-slate-300 break-all">{report.sha256IntegrityHash}</p>
            </div>

            <button
              onClick={handleCopyHash}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 transition-colors shrink-0 text-slate-200 cursor-pointer"
            >
              {copiedHash ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copiedHash ? 'Copied' : 'Copy Hash'}
            </button>
          </div>
        </div>
      </div>

      {/* Traceability Calculation Modal */}
      <CalculationModal
        isOpen={!!activeExplanation}
        onClose={() => setActiveExplanation(null)}
        explanation={activeExplanation}
      />
    </div>
  );
};
