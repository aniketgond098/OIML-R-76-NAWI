import React, { useState } from 'react';
import { TestSession } from '../../../types/testSession';
import { TestReport } from '../../../types/report';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { StatusBadge } from '../../common/StatusBadge';
import { CalculationModal } from '../../common/CalculationModal';
import { CalculationExplanation } from '../../../types/metrology';
import { calculateWeighingError } from '../../../metrology/calculations/weighing';
import { calculateRepeatability } from '../../../metrology/calculations/repeatability';
import { calculateEccentricityPosition } from '../../../metrology/calculations/eccentricity';
import { calculateZeroSetting } from '../../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../../metrology/calculations/tare';
import {
  UserCheck,
  Scale,
  Thermometer,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Calculator,
  MessageSquare,
  Clock,
  Send,
  RotateCcw,
} from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  canApprove: boolean;
  onApprove: (comments: string) => Promise<void>;
  onReject: (comments: string) => void;
  onSaveNotes: (notes: string) => void;
  onViewReport?: (reportId: string) => void;
  matchedReport?: TestReport;
}

export const ReviewTab: React.FC<Props> = ({
  session,
  isReadOnly,
  canApprove,
  onApprove,
  onReject,
  onSaveNotes,
  onViewReport,
  matchedReport,
}) => {
  const inst = session.instrumentSnapshot;
  const [reviewerComments, setReviewerComments] = useState(
    session.reviewerComments || 'Full Metrological Verification evaluated against OIML R 76-1:2006 requirements.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState<CalculationExplanation | null>(null);

  const env = session.environmentalReadings?.[0] || {
    temperatureC: 20.0,
    relativeHumidityPercent: 50,
    atmosphericPressureHPa: 1013,
  };

  const isPass = session.overallCompliance === 'PASS';
  const isFail = session.overallCompliance === 'FAIL';
  const isApproved = session.status === 'REPORT_GENERATED' || session.status === 'APPROVED';

  // Helper to trace calculations
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
      nominalLoadL: firstPoint.nominalLoad ?? inst.maxCapacity / 3,
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

  const handleConfirmApproval = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(reviewerComments);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRejection = () => {
    onReject(reviewerComments);
    setShowRejectConfirm(false);
  };

  return (
    <div id="reviewer-experience-container" className="space-y-6">
      {/* Reviewer Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Official Metrology Review
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">{session.testSessionNumber}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Verification Sign-off & Compliance Audit
            </h2>
            <p className="text-xs text-slate-500">
              Authorized officer review for legal metrology certification under OIML R 76-1:2006
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={session.status} />
            <ComplianceBadge status={session.overallCompliance} size="lg" />
          </div>
        </div>

        {/* Key Verification Metadata Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Technician Info */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <UserCheck size={13} className="text-indigo-600" />
              Testing Technician
            </span>
            <p className="font-bold text-slate-900 text-xs">{session.technicianName}</p>
            <p className="text-[11px] text-slate-500 font-mono">
              Started: {new Date(session.startedAt || session.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Instrument Specs */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Scale size={13} className="text-indigo-600" />
              Instrument Verified
            </span>
            <p className="font-bold text-slate-900 text-xs truncate">
              {inst.manufacturer} {inst.model}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              SN: {inst.serialNumber} • Class {inst.accuracyClass.replace('CLASS_', '')}
            </p>
          </div>

          {/* Environmental Ambient */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Thermometer size={13} className="text-indigo-600" />
              Ambient Conditions
            </span>
            <p className="font-bold text-slate-900 text-xs font-mono">
              {env.temperatureC}°C • {env.relativeHumidityPercent}% RH
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Pressure: {env.atmosphericPressureHPa || 1013} hPa
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Overview Banner */}
      <div
        className={`p-4 sm:p-5 rounded-xl border ${
          isPass
            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
            : isFail
            ? 'bg-rose-50/70 border-rose-300 text-rose-950'
            : 'bg-amber-50/70 border-amber-300 text-amber-950'
        } space-y-2`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPass ? (
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            ) : isFail ? (
              <XCircle size={18} className="text-rose-700 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-amber-700 shrink-0" />
            )}
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Metrological Compliance Result: {session.overallCompliance}
            </h3>
          </div>
          <span className="text-xs font-mono font-bold">
            Standard: {session.standardEdition || 'OIML R 76-1:2006'}
          </span>
        </div>
        <p className="text-xs leading-relaxed font-sans text-slate-800">
          {session.complianceSummary?.summaryNotes ||
            (isPass
              ? 'All prescribed test observation errors are within maximum permissible error (MPE) tolerances.'
              : isFail
              ? 'One or more observations exceed maximum permissible error (MPE) thresholds.'
              : 'Observations are pending completion or evaluation.')}
        </p>
      </div>

      {/* Module Breakdown & Inspection */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Module Verification Inspection Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Inspect test readings, calculation derivations, and compliance limits
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {/* 1. Weighing Accuracy */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  1. Weighing Performance & Errors (Clause 3.5.1 / A.4.4.3)
                </span>
                <span className="text-[11px] text-slate-500">
                  ({session.weighingObservations?.length || 0} points)
                </span>
              </div>
              <ComplianceBadge
                status={
                  session.testPlan?.find((p) => p.category === 'WEIGHING_ACCURACY')?.compliance ||
                  'NOT_EVALUATED'
                }
                size="sm"
              />
            </div>

            {session.weighingObservations && session.weighingObservations.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                      <th className="p-2.5 pl-3">Nominal Load (L)</th>
                      <th className="p-2.5">Indicated (I)</th>
                      <th className="p-2.5">Corrected Error (Ec)</th>
                      <th className="p-2.5">MPE Limit</th>
                      <th className="p-2.5 text-center">Derivation</th>
                      <th className="p-2.5 pr-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {session.weighingObservations.map((obs, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 pl-3 font-bold text-slate-800">
                          {obs.nominalLoad} {inst.unit}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {obs.indicatedValue} {inst.unit}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={
                              obs.compliance === 'PASS'
                                ? 'text-emerald-700 font-bold'
                                : obs.compliance === 'FAIL'
                                ? 'text-rose-700 font-bold'
                                : 'text-slate-700'
                            }
                          >
                            {obs.correctedErrorEc !== undefined
                              ? `${obs.correctedErrorEc > 0 ? '+' : ''}${obs.correctedErrorEc.toFixed(4)} ${inst.unit}`
                              : '-'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">
                          {obs.mpeInUnit !== undefined
                            ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}`
                            : `±${obs.mpeE}e`}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleInspectWeighingRow(obs)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-sans font-semibold border border-indigo-200 transition-colors"
                          >
                            <Calculator size={11} /> Trace
                          </button>
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          <ComplianceBadge status={obs.compliance} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No weighing readings recorded.</p>
            )}
          </div>

          {/* 2. Repeatability */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  2. Repeatability (Clause 3.6.1)
                </span>
                <span className="text-[11px] text-slate-500">
                  ({session.repeatabilitySeries?.length || 0} series)
                </span>
              </div>
              <ComplianceBadge
                status={
                  session.testPlan?.find((p) => p.category === 'REPEATABILITY')?.compliance ||
                  'NOT_EVALUATED'
                }
                size="sm"
              />
            </div>

            {session.repeatabilitySeries && session.repeatabilitySeries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.repeatabilitySeries.map((s, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Series {idx + 1}: {s.nominalLoad} {inst.unit}
                      </span>
                      <ComplianceBadge status={s.compliance} size="sm" />
                    </div>
                    <div className="text-[11px] font-mono text-slate-600 space-y-0.5">
                      <div>Span difference (ΔI): <strong className="text-slate-900">{s.deltaI?.toFixed(4)} {inst.unit}</strong></div>
                      <div>Max allowable (|MPE|): <strong className="text-slate-700">{s.mpeInUnit?.toFixed(4)} {inst.unit}</strong></div>
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{s.readings?.length || 0} runs recorded</span>
                      <button
                        onClick={() => handleInspectRepeatability(s)}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:underline font-semibold"
                      >
                        <Calculator size={11} /> Trace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No repeatability readings recorded.</p>
            )}
          </div>

          {/* 3. Eccentricity */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs">
                  3. Eccentric Loading (Clause 3.6.2)
                </span>
                <span className="text-[11px] text-slate-500">
                  ({session.eccentricityObservations?.length || 0} positions)
                </span>
              </div>
              <ComplianceBadge
                status={
                  session.testPlan?.find((p) => p.category === 'ECCENTRICITY')?.compliance ||
                  'NOT_EVALUATED'
                }
                size="sm"
              />
            </div>

            {session.eccentricityObservations && session.eccentricityObservations.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[10px] uppercase">
                      <th className="p-2.5 pl-3">Position</th>
                      <th className="p-2.5">Applied Load</th>
                      <th className="p-2.5">Corrected Error (Ec)</th>
                      <th className="p-2.5">MPE Limit</th>
                      <th className="p-2.5 pr-3 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-xs">
                    {session.eccentricityObservations.map((ecc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="p-2.5 pl-3 font-sans font-bold text-slate-800">
                          {ecc.positionName || `Position ${ecc.positionId}`}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {ecc.nominalLoad} {inst.unit}
                        </td>
                        <td className="p-2.5">
                          <span
                            className={
                              ecc.compliance === 'PASS'
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-700 font-bold'
                            }
                          >
                            {ecc.correctedErrorEc > 0 ? '+' : ''}
                            {ecc.correctedErrorEc?.toFixed(4)} {inst.unit}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">
                          ±{ecc.mpeInUnit?.toFixed(4)} {inst.unit}
                        </td>
                        <td className="p-2.5 pr-3 text-right">
                          <ComplianceBadge status={ecc.compliance} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No eccentricity readings recorded.</p>
            )}
          </div>

          {/* 4. Zero Setting & Tare */}
          <div className="p-4 sm:p-5 space-y-3">
            <span className="font-bold text-slate-900 text-xs block">
              4. Zero-Setting Accuracy & Tare Mechanism (Clauses 4.5.2 & 4.6.3)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Zero */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Zero Setting (Clause 4.5.2)</span>
                  <ComplianceBadge
                    status={session.zeroSettingObservation?.compliance || 'PASS'}
                    size="sm"
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-600">
                  Zero Error: <strong className="text-slate-900">{(session.zeroSettingObservation?.calculatedZeroErrorE0 || 0).toFixed(5)} {inst.unit}</strong>
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Limit: ±0.25 e</span>
                  {session.zeroSettingObservation && (
                    <button
                      onClick={() => handleInspectZero(session.zeroSettingObservation)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:underline font-semibold"
                    >
                      <Calculator size={11} /> Trace
                    </button>
                  )}
                </div>
              </div>

              {/* Tare */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Tare Mechanism (Clause 4.6.3)</span>
                  <ComplianceBadge
                    status={session.tareObservation?.compliance || 'PASS'}
                    size="sm"
                  />
                </div>
                <p className="text-[11px] font-mono text-slate-600">
                  Tare Error: <strong className="text-slate-900">{(session.tareObservation?.calculatedTareError || 0).toFixed(5)} {inst.unit}</strong>
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Limit: ±0.25 e</span>
                  {session.tareObservation && (
                    <button
                      onClick={() => handleInspectTare(session.tareObservation)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-700 hover:underline font-semibold"
                    >
                      <Calculator size={11} /> Trace
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviewer Decision Notes & Official Action Controls */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <MessageSquare size={14} className="text-indigo-600" />
            Reviewer Decision & Assessment Comments
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add notes regarding test conditions, verification observations, or reasons for decision
          </p>
        </div>

        <textarea
          rows={3}
          value={reviewerComments}
          disabled={isApproved || !canApprove}
          onChange={(e) => {
            setReviewerComments(e.target.value);
            onSaveNotes(e.target.value);
          }}
          placeholder="Enter formal review observations, condition notes, or verification comments..."
          className="w-full text-xs font-sans p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-50 disabled:text-slate-600"
        />

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            {isApproved ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 size={14} /> Report has been officially approved and sealed.
              </span>
            ) : canApprove ? (
              <span>Review complete? Authorize and seal the official certificate or request retest.</span>
            ) : (
              <span>Only authorized Reviewer Officers can sign off and seal test reports.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Sealed Report if already generated */}
            {matchedReport && onViewReport && (
              <button
                onClick={() => onViewReport(matchedReport.id)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <FileCheck size={14} /> View Sealed Report
              </button>
            )}

            {/* Reject / Request Changes */}
            {!isApproved && canApprove && (
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={14} /> Request Retest / Reject
              </button>
            )}

            {/* Approve and Seal */}
            {!isApproved && canApprove && (
              <button
                onClick={handleConfirmApproval}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileCheck size={15} />
                {isSubmitting ? 'Sealing Report...' : 'Approve & Seal Official Report'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Reject Test Session & Request Retest?</span>
            </div>
            <p className="text-xs text-slate-600">
              This session will be marked as requiring revision. The technician will be notified
              with your comments.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Traceability Calculation Modal */}
      <CalculationModal
        isOpen={!!activeExplanation}
        onClose={() => setActiveExplanation(null)}
        explanation={activeExplanation}
      />
    </div>
  );
};
