import React, { useState } from 'react';
import { TestSession, TiltingObservation } from '../../../types/testSession';
import { calculateTilting, TiltPositionReading } from '../../../metrology/calculations/tilting';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Compass, SkipForward, Calculator } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: TiltingObservation) => void;
  onSkip?: () => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedTiltingStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onSkip,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existing = session.tiltingObservation;
  const e = inst.verificationScaleInterval || 1;
  const testLoad = Math.min(inst.maxCapacity, 2000 * e);

  const [readings, setReadings] = useState<TiltPositionReading[]>(() => {
    return [
      { tiltDirection: 'LEVEL', tiltValuePermil: 0, zeroIndication: 0, loadApplied: testLoad, loadIndication: testLoad },
      { tiltDirection: 'FRONT', tiltValuePermil: 50, zeroIndication: 0, loadApplied: testLoad, loadIndication: testLoad },
      { tiltDirection: 'BACK', tiltValuePermil: 50, zeroIndication: 0, loadApplied: testLoad, loadIndication: testLoad },
      { tiltDirection: 'LEFT', tiltValuePermil: 50, zeroIndication: 0, loadApplied: testLoad, loadIndication: testLoad },
      { tiltDirection: 'RIGHT', tiltValuePermil: 50, zeroIndication: 0, loadApplied: testLoad, loadIndication: testLoad },
    ];
  });

  const evaluation = calculateTilting({
    accuracyClass: inst.accuracyClass,
    verificationScaleIntervalE: e,
    unit: inst.unit,
    readings,
  });

  const isCompliant = evaluation.overallCompliance === 'PASS';

  const updateIndication = (index: number, val: number) => {
    setReadings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], loadIndication: val };
      return copy;
    });
  };

  const handleFinish = () => {
    const obs: TiltingObservation = {
      positions: evaluation.positions.map((p) => ({
        positionName: p.tiltDirection,
        tiltValuePermil: p.tiltValuePermil,
        zeroErrorE0: p.zeroErrorE0,
        loadErrorEL: p.correctedErrorEc,
        errorDifferenceFromLevel: p.differenceFromLevelEc,
        mpe: p.mpeInUnit,
        compliance: p.compliance,
      })),
      maxDifferenceFromLevel: evaluation.maxDifferenceFromLevel,
      limitingTiltValuePermil: 50,
      compliance: evaluation.overallCompliance,
    };
    onSave(obs);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Clause 3.9.1.1 & A.5.1: Tilting Test
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Limiting Inclination (50 ‰ Tilt Sensitivity)
          </h3>
        </div>
        <button
          onClick={onWhyClick}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
        >
          <HelpCircle size={14} /> Why am I doing this?
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-purple-900">
            <Compass size={15} />
            <span>OIML Clause 3.9.1.1: 50 ‰ Tilting Limit</span>
          </div>
          <p className="text-purple-900/90 leading-relaxed">
            Instrument is tilted axially by 50 ‰ (50 mm/m). The difference between indication at tilted position and level position must not exceed Maximum Permissible Error (MPE).
          </p>
        </div>

        {/* Readings table */}
        <div className="space-y-3">
          {readings.map((r, idx) => (
            <div key={r.tiltDirection} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
              <div className="font-bold text-slate-800 w-28">
                {r.tiltDirection === 'LEVEL' ? '1. LEVEL (Ref)' : `${idx + 1}. ${r.tiltDirection} (50‰)`}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-mono">Load: {r.loadApplied} {inst.unit}</span>
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={r.loadIndication}
                  onChange={(e) => updateIndication(idx, parseFloat(e.target.value) || 0)}
                  className="w-24 px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-mono bg-white text-right"
                />
                <span className="text-slate-400 font-mono text-[11px]">{inst.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time badge */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calculator size={14} className="text-indigo-600" />
            Max Difference: {evaluation.maxDifferenceFromLevel.toFixed(4)} {inst.unit}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
              isCompliant
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {isCompliant ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {evaluation.overallCompliance}
          </span>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onBackToOverview}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Overview
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onSkip && !isReadOnly && (
              <button
                onClick={onSkip}
                className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                title="Mark as not required for this routine verification regime"
              >
                <SkipForward size={14} /> Skip / Excluded
              </button>
            )}

            {!isReadOnly && (
              <button
                onClick={handleFinish}
                className={`w-full sm:w-auto px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 ${
                  isCompliant ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <span>Save Tilting Test & Continue</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
