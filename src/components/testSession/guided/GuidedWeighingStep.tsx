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

  const [showAllModal, setShowAllModal] = useState<boolean>(false);
  const [actualLoads, setActualLoads] = useState<number[]>(() => {
    if (existingObs.length >= defaultTargetPoints.length) {
      return existingObs.map((o) => o.nominalLoad);
    }
    return defaultTargetPoints.map((p) => p.load);
  });

  const [viewSummary, setViewSummary] = useState<boolean>(existingObs.length >= defaultTargetPoints.length);

  // Evaluate zero error E0 first
  const zeroObs = readings[0] !== undefined
    ? calculateWeighingError({
        nominalLoadL: actualLoads[0] ?? 0,
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
    const actLoad = actualLoads[idx] ?? pt.load;
    const indicated = readings[idx];
    const res = calculateWeighingError({
      nominalLoadL: actLoad,
      indicatedValueI: indicated,
      verificationScaleIntervalE: e,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      zeroErrorE0: zeroObs,
    });
    return {
      ...pt,
      actualLoad: actLoad,
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
            Weighing & Linearity Performance (Clause 3.5.1 & A.4.4)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewSummary
              ? 'Weighing Performance — Results Summary'
              : `Point ${activePointIndex + 1} of ${defaultTargetPoints.length}: ${currentPt.name}`}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            View All Measurements
          </button>
          <button
            onClick={onWhyClick}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
          >
            <HelpCircle size={14} /> Why this test?
          </button>
        </div>
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

            {/* WHAT TO DO Instruction Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">What To Do</h4>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>Place the specified reference load (<strong className="text-slate-900">{currentPt.load} {inst.unit}</strong>) gently in the center of the platform.</li>
                <li>Wait for the reading to stabilize (stability indicator illuminates).</li>
                <li>Verify or adjust actual reference weight value, then enter the displayed indication.</li>
                <li>Check the automatically calculated corrected error and MPE result.</li>
                <li>Press <strong className="text-indigo-600">Save & Continue</strong> to record and advance.</li>
              </ol>
            </div>

            {/* Target Load & Actual Reference Load */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <span className="text-[11px] font-semibold text-indigo-900 block">Required Nominal Load:</span>
                <span className="text-lg font-bold font-mono text-indigo-950">
                  {currentPt.load} {inst.unit}
                </span>
                <span className="text-[10px] text-indigo-700 block mt-0.5 uppercase font-medium">
                  {currentPt.dir} Direction
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Actual / Reference Standard Load ({inst.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={actualLoads[activePointIndex]}
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = [...actualLoads];
                    updated[activePointIndex] = val;
                    setActualLoads(updated);
                  }}
                  className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Displayed Indication Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Displayed Indication ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={readings[activePointIndex]}
                  disabled={isReadOnly}
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

            {/* Automatic Calculations & Live Feedback */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">Calculated Difference (Ec):</span>
                <strong className="text-slate-900 text-sm">{currentEval.correctedErrorEc.toFixed(4)} {inst.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">MPE Limit:</span>
                <span className="text-slate-700">±{currentEval.mpeInUnit.toFixed(4)} {inst.unit} (±{currentEval.mpeE}e)</span>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase font-sans inline-flex items-center gap-1 ${
                    currentEval.compliance === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {currentEval.compliance === 'PASS' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
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
                    All 8 test points are within the maximum permissible error (MPE) tolerances.
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{activePointIndex === defaultTargetPoints.length - 1 ? 'Save & Review Summary' : 'Save & Continue'}</span>
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewSummary(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Edit Measurements
            </button>

            <button
              onClick={handleFinish}
              disabled={isReadOnly}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Complete Weighing Test & Continue
            </button>
          </>
        )}
      </div>

      {/* Optional "View All Measurements" Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">All Weighing Performance Measurements</h4>
                <p className="text-xs text-slate-500">Overview of all 8 ascending and descending load points</p>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Point</th>
                    <th className="py-2 px-3">Dir</th>
                    <th className="py-2 px-3">Req Load</th>
                    <th className="py-2 px-3">Ref Load</th>
                    <th className="py-2 px-3">Indication</th>
                    <th className="py-2 px-3">Error (Ec)</th>
                    <th className="py-2 px-3">MPE</th>
                    <th className="py-2 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {evaluatedPoints.map((pt, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/80 cursor-pointer ${idx === activePointIndex ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => {
                        setActivePointIndex(idx);
                        setShowAllModal(false);
                      }}
                    >
                      <td className="py-2 px-3 font-sans font-medium">{idx + 1}. {pt.name.split(' (')[0]}</td>
                      <td className="py-2 px-3 font-sans text-[10px]">{pt.dir}</td>
                      <td className="py-2 px-3">{pt.load} {inst.unit}</td>
                      <td className="py-2 px-3">{pt.actualLoad} {inst.unit}</td>
                      <td className="py-2 px-3 font-bold">{pt.indicated} {inst.unit}</td>
                      <td className="py-2 px-3">{pt.correctedErrorEc.toFixed(4)}</td>
                      <td className="py-2 px-3">±{pt.mpeInUnit.toFixed(4)}</td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pt.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAllModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
