import React, { useState } from 'react';
import { TestSession, WeighingTestObservation } from '../../../types/testSession';
import { calculateWeighingError } from '../../../metrology/calculations/weighing';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Scale, ChevronRight } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: WeighingTestObservation[]) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedWeighingStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existingObs = session.weighingObservations || [];

  const e = inst.verificationScaleInterval;
  const max = inst.maxCapacity;
  const min = inst.minCapacity;

  // 8 standard OIML test points
  const defaultTargetPoints = [
    { name: '1. Zero Load (Ascending)', load: 0, dir: 'ASCENDING' as const, desc: 'Empty platform verification' },
    { name: '2. Minimum Capacity (Min)', load: min, dir: 'ASCENDING' as const, desc: 'Lower operating limit of the instrument' },
    { name: '3. Lower MPE Step Change (~500e)', load: Math.min(500 * e, max * 0.25), dir: 'ASCENDING' as const, desc: 'Boundary where MPE tolerance steps to ±1.0e' },
    { name: '4. Upper MPE Step Change (~2000e)', load: Math.min(2000 * e, max * 0.5), dir: 'ASCENDING' as const, desc: 'Boundary where MPE tolerance steps to ±1.5e' },
    { name: '5. Maximum Capacity (Max)', load: max, dir: 'ASCENDING' as const, desc: 'Full capacity of the load receptor' },
    { name: '6. Returning Upper Step (~2000e)', load: Math.min(2000 * e, max * 0.5), dir: 'DESCENDING' as const, desc: 'Descending load for hysteresis check' },
    { name: '7. Returning Lower Step (~500e)', load: Math.min(500 * e, max * 0.25), dir: 'DESCENDING' as const, desc: 'Descending load hysteresis check' },
    { name: '8. Returning Zero', load: 0, dir: 'DESCENDING' as const, desc: 'Zero return check' },
  ];

  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const [readings, setReadings] = useState<number[]>(() => {
    if (existingObs.length >= defaultTargetPoints.length) {
      return existingObs.map((o) => o.indicatedValue);
    }
    return defaultTargetPoints.map((p) => p.load);
  });

  const [viewSummary, setViewSummary] = useState<boolean>(existingObs.length >= defaultTargetPoints.length);

  // Evaluate zero error E0 first
  const zeroObs = readings[0] !== undefined
    ? calculateWeighingError({
        nominalLoadL: 0,
        indicatedValueI: readings[0],
        verificationScaleIntervalE: e,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        zeroErrorE0: 0,
      }).errorPriorToRoundingE
    : 0;

  // Evaluate all points
  const evaluatedPoints = defaultTargetPoints.map((pt, idx) => {
    const indicated = readings[idx];
    const res = calculateWeighingError({
      nominalLoadL: pt.load,
      indicatedValueI: indicated,
      verificationScaleIntervalE: e,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      zeroErrorE0: zeroObs,
    });
    return {
      ...pt,
      indicated,
      ...res,
    };
  });

  const overallPass = evaluatedPoints.every((p) => p.compliance === 'PASS');

  const handleFinish = () => {
    const observations: WeighingTestObservation[] = evaluatedPoints.map((p, idx) => ({
      id: `obs-w-${Date.now()}-${idx}`,
      testPointIndex: idx + 1,
      nominalLoad: p.load,
      indicatedValue: p.indicated,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      direction: p.dir,
      calculatedIndicationP: p.calculatedIndicationP,
      errorPriorToRoundingE: p.errorPriorToRoundingE,
      zeroErrorE0: zeroObs,
      correctedErrorEc: p.correctedErrorEc,
      mpeE: p.mpeE,
      mpeInUnit: p.mpeInUnit,
      compliance: p.compliance,
    }));
    onSave(observations);
  };

  const currentPt = defaultTargetPoints[activePointIndex];
  const currentEval = evaluatedPoints[activePointIndex];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Weighing Performance Test (Clause 3.5.1 & A.4.4)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewSummary
              ? 'Weighing Performance Results'
              : `Point ${activePointIndex + 1} of ${defaultTargetPoints.length}: ${currentPt.name}`}
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
        {!viewSummary ? (
          <div className="space-y-5">
            {/* Step progress pills */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              {defaultTargetPoints.map((pt, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePointIndex(idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-center text-[11px] font-bold border transition-colors shrink-0 ${
                    idx === activePointIndex
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : evaluatedPoints[idx].compliance === 'PASS'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Pt {idx + 1} ({pt.load} {inst.unit})
                </button>
              ))}
            </div>

            {/* Instruction Card */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">
                  {currentPt.name} ({currentPt.dir})
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {currentPt.dir}
                </span>
              </div>
              <p className="text-xs text-slate-700">
                {currentPt.desc}
              </p>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 inline-block text-xs">
                <span className="text-slate-500 font-medium">Place test load on the platform:</span>{' '}
                <strong className="text-slate-900 font-mono text-sm">{currentPt.load} {inst.unit}</strong>
              </div>
            </div>

            {/* Measurement Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Displayed Indication ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={readings[activePointIndex]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = [...readings];
                    updated[activePointIndex] = val;
                    setReadings(updated);
                  }}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
            </div>

            {/* Live Feedback */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">Corrected Error (Ec):</span>
                <strong className="text-slate-900">{currentEval.correctedErrorEc.toFixed(4)} {inst.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">MPE Limit:</span>
                <span className="text-slate-700">±{currentEval.mpeInUnit.toFixed(4)} {inst.unit} (±{currentEval.mpeE}e)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-sans ${
                    currentEval.compliance === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {currentEval.compliance}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* RESULT SUMMARY */
          <div className="space-y-5">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                overallPass
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {overallPass ? (
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                ) : (
                  <XCircle size={24} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {overallPass ? 'Weighing Performance Passed' : 'Weighing Performance Failed'}
                  </h4>
                  <p className="text-xs opacity-90">
                    All test points are within the maximum permissible error limits.
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase ${
                  overallPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {overallPass ? 'PASS' : 'FAIL'}
              </span>
            </div>

            {/* Clean summary list */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {evaluatedPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">
                      {pt.name} ({pt.load} {inst.unit})
                    </span>
                    <span className="text-slate-500 font-mono text-[11px] block">
                      Indication: {pt.indicated.toFixed(3)} {inst.unit} • Error: {pt.correctedErrorEc.toFixed(4)} {inst.unit} (Limit: ±{pt.mpeInUnit.toFixed(3)})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      pt.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {pt.compliance}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {!viewSummary ? (
          <>
            <button
              onClick={() => {
                if (activePointIndex > 0) {
                  setActivePointIndex(activePointIndex - 1);
                } else {
                  onBackToOverview();
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>

            <button
              onClick={() => {
                if (activePointIndex < defaultTargetPoints.length - 1) {
                  setActivePointIndex(activePointIndex + 1);
                } else {
                  setViewSummary(true);
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {activePointIndex === defaultTargetPoints.length - 1 ? 'View Result Summary' : 'Next Test Load'}{' '}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewSummary(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Edit Test Points
            </button>

            <button
              onClick={handleFinish}
              disabled={isReadOnly}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Complete Weighing Test & Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};
