import React, { useState } from 'react';
import { TestSession, RepeatabilitySeries } from '../../../types/testSession';
import { calculateRepeatability } from '../../../metrology/calculations/repeatability';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Scale } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (series: RepeatabilitySeries[]) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedRepeatabilityStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existingSeries = session.repeatabilitySeries || [];

  const halfMaxLoad = Number((inst.maxCapacity * 0.5).toFixed(3));
  const fullMaxLoad = Number(inst.maxCapacity.toFixed(3));

  // Default initial values
  const [activeSeriesIndex, setActiveSeriesIndex] = useState<0 | 1>(0); // 0: 50% Max, 1: 100% Max
  const [activeRunIndex, setActiveRunIndex] = useState<number>(0); // 0, 1, 2 (Runs 1, 2, 3)

  // 3 readings for Series 1 (half max)
  const [series1Readings, setSeries1Readings] = useState<number[]>(() => {
    if (existingSeries[0]?.readings?.length >= 3) {
      return existingSeries[0].readings.map((r) => r.indicatedValue);
    }
    return [halfMaxLoad, halfMaxLoad, halfMaxLoad];
  });

  // 3 readings for Series 2 (full max)
  const [series2Readings, setSeries2Readings] = useState<number[]>(() => {
    if (existingSeries[1]?.readings?.length >= 3) {
      return existingSeries[1].readings.map((r) => r.indicatedValue);
    }
    return [fullMaxLoad, fullMaxLoad, fullMaxLoad];
  });

  const [viewSummary, setViewSummary] = useState(existingSeries.length >= 2);

  // Evaluators
  const evalSeries1 = calculateRepeatability({
    nominalLoadL: halfMaxLoad,
    readings: series1Readings.map((val, idx) => ({
      runIndex: idx + 1,
      zeroIndication: 0,
      indicatedValue: val,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
    })),
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
    accuracyClass: inst.accuracyClass,
  });

  const evalSeries2 = calculateRepeatability({
    nominalLoadL: fullMaxLoad,
    readings: series2Readings.map((val, idx) => ({
      runIndex: idx + 1,
      zeroIndication: 0,
      indicatedValue: val,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
    })),
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
    accuracyClass: inst.accuracyClass,
  });

  const overallPass = evalSeries1.compliance === 'PASS' && evalSeries2.compliance === 'PASS';

  const handleFinish = () => {
    const s1: RepeatabilitySeries = {
      id: `rep-series-${Date.now()}-1`,
      seriesNumber: 1,
      nominalLoad: halfMaxLoad,
      readings: series1Readings.map((val, idx) => ({
        runIndex: idx + 1,
        zeroIndication: 0,
        indicatedValue: val,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      })),
      maxIndication: evalSeries1.maxIndication,
      minIndication: evalSeries1.minIndication,
      deltaI: evalSeries1.deltaI,
      meanIndication: evalSeries1.meanIndication,
      stdDeviation: evalSeries1.stdDeviation,
      mpeInUnit: evalSeries1.mpeInUnit,
      compliance: evalSeries1.compliance,
    };

    const s2: RepeatabilitySeries = {
      id: `rep-series-${Date.now()}-2`,
      seriesNumber: 2,
      nominalLoad: fullMaxLoad,
      readings: series2Readings.map((val, idx) => ({
        runIndex: idx + 1,
        zeroIndication: 0,
        indicatedValue: val,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      })),
      maxIndication: evalSeries2.maxIndication,
      minIndication: evalSeries2.minIndication,
      deltaI: evalSeries2.deltaI,
      meanIndication: evalSeries2.meanIndication,
      stdDeviation: evalSeries2.stdDeviation,
      mpeInUnit: evalSeries2.mpeInUnit,
      compliance: evalSeries2.compliance,
    };

    onSave([s1, s2]);
  };

  const currentTargetLoad = activeSeriesIndex === 0 ? halfMaxLoad : fullMaxLoad;
  const currentReadings = activeSeriesIndex === 0 ? series1Readings : series2Readings;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Repeatability Test (Clause 3.6.1)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewSummary
              ? 'Repeatability Test Results'
              : `Series ${activeSeriesIndex + 1} of 2 (${currentTargetLoad} ${inst.unit}) - Run ${activeRunIndex + 1} of 3`}
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
            {/* Step Progress Pills */}
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 py-1.5 px-3 rounded-lg text-center text-xs font-bold border transition-colors ${
                  activeSeriesIndex === 0
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Series 1: 50% Max ({halfMaxLoad} {inst.unit})
              </div>
              <div
                className={`flex-1 py-1.5 px-3 rounded-lg text-center text-xs font-bold border transition-colors ${
                  activeSeriesIndex === 1
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                Series 2: Max Capacity ({fullMaxLoad} {inst.unit})
              </div>
            </div>

            {/* Run Indicator */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Run {activeRunIndex + 1} of 3
                </span>
                <span className="font-mono text-slate-500">
                  Target Load: <strong className="text-slate-900">{currentTargetLoad} {inst.unit}</strong>
                </span>
              </div>

              <div className="flex gap-1.5">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      idx === activeRunIndex
                        ? 'bg-indigo-600'
                        : idx < activeRunIndex
                        ? 'bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block mb-1">
                  Instructions for Run {activeRunIndex + 1}
                </span>
                <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                  <li>Verify instrument is unloaded and at zero.</li>
                  <li>
                    Place the test load of <strong>{currentTargetLoad} {inst.unit}</strong> on the platform.
                  </li>
                  <li>Wait for the display to stabilize, then enter the value shown.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Displayed Indication ({inst.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={currentReadings[activeRunIndex]}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (activeSeriesIndex === 0) {
                        const updated = [...series1Readings];
                        updated[activeRunIndex] = val;
                        setSeries1Readings(updated);
                      } else {
                        const updated = [...series2Readings];
                        updated[activeRunIndex] = val;
                        setSeries2Readings(updated);
                      }
                    }}
                    className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                    {inst.unit}
                  </span>
                </div>
              </div>

              {/* Live readings table */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">
                  Recorded Readings in Series {activeSeriesIndex + 1}:
                </span>
                <div className="grid grid-cols-3 gap-2 font-mono">
                  {currentReadings.map((val, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-center border ${
                        idx === activeRunIndex
                          ? 'bg-indigo-100 border-indigo-300 font-bold text-indigo-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] block text-slate-400 font-sans">Run {idx + 1}</span>
                      {val.toFixed(3)} {inst.unit}
                    </div>
                  ))}
                </div>
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
                    {overallPass ? 'Repeatability Test Passed' : 'Repeatability Test Failed'}
                  </h4>
                  <p className="text-xs opacity-90">
                    Max difference (ΔI) in all series is within the maximum permissible error (MPE).
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

            {/* Results for each series */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Series 1 (50% Max: {halfMaxLoad} {inst.unit})
                </span>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-sans">Difference (ΔI):</span>
                  <strong className="text-slate-900">{evalSeries1.deltaI.toFixed(4)} {inst.unit}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-sans">Limit (MPE):</span>
                  <span className="text-slate-700">≤ {evalSeries1.mpeInUnit.toFixed(4)} {inst.unit}</span>
                </div>
                <div className="text-right pt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    evalSeries1.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {evalSeries1.compliance}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Series 2 (100% Max: {fullMaxLoad} {inst.unit})
                </span>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-sans">Difference (ΔI):</span>
                  <strong className="text-slate-900">{evalSeries2.deltaI.toFixed(4)} {inst.unit}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 font-sans">Limit (MPE):</span>
                  <span className="text-slate-700">≤ {evalSeries2.mpeInUnit.toFixed(4)} {inst.unit}</span>
                </div>
                <div className="text-right pt-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    evalSeries2.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {evalSeries2.compliance}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {!viewSummary ? (
          <>
            <button
              onClick={() => {
                if (activeRunIndex > 0) {
                  setActiveRunIndex(activeRunIndex - 1);
                } else if (activeSeriesIndex === 1) {
                  setActiveSeriesIndex(0);
                  setActiveRunIndex(2);
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
                if (activeRunIndex < 2) {
                  setActiveRunIndex(activeRunIndex + 1);
                } else if (activeSeriesIndex === 0) {
                  setActiveSeriesIndex(1);
                  setActiveRunIndex(0);
                } else {
                  setViewSummary(true);
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {activeRunIndex === 2 && activeSeriesIndex === 1 ? 'View Result Summary' : 'Save Run & Continue'}{' '}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewSummary(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Edit Readings
            </button>

            <button
              onClick={handleFinish}
              disabled={isReadOnly}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Complete Repeatability Test & Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};
