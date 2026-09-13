import React, { useState } from 'react';
import { TestSession, TareObservation } from '../../../types/testSession';
import { calculateTare } from '../../../metrology/calculations/tare';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Sliders } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: TareObservation) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedTareStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existing = session.tareObservation;

  const defaultTareLoad = Number((inst.maxCapacity * 0.3).toFixed(3));
  const defaultNetLoad = Number((inst.maxCapacity * 0.4).toFixed(3));

  const [subStep, setSubStep] = useState<number>(existing ? 4 : 1);
  const [tareLoad, setTareLoad] = useState<number>(existing ? existing.tareLoadApplied : defaultTareLoad);
  const [indicatedTare, setIndicatedTare] = useState<number>(existing ? existing.indicatedTare : defaultTareLoad);
  const [netLoad, setNetLoad] = useState<number>(
    existing?.netTestPoints?.[0]?.nominalNetLoad || defaultNetLoad
  );
  const [indicatedNet, setIndicatedNet] = useState<number>(
    existing?.netTestPoints?.[0]?.indicatedNet || defaultNetLoad
  );

  const evaluation = calculateTare({
    tareLoadApplied: tareLoad,
    indicatedTare,
    turningPointDeltaLTare: 0.5 * inst.actualScaleInterval,
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
    accuracyClass: inst.accuracyClass,
    netTestPoints: [
      {
        nominalNetLoad: netLoad,
        indicatedNet,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      },
    ],
  });

  const handleFinish = () => {
    const obs: TareObservation = {
      tareLoadApplied: tareLoad,
      indicatedTare,
      turningPointDeltaLTare: 0.5 * inst.actualScaleInterval,
      calculatedTareError: evaluation.calculatedTareError,
      netTestPoints: evaluation.evaluatedNetPoints.map((pt) => ({
        nominalNetLoad: pt.nominalNetLoad,
        indicatedNet: pt.indicatedNet,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        correctedNetErrorEc: pt.correctedNetErrorEc,
        mpeInUnit: pt.mpeInUnit,
        compliance: pt.compliance,
      })),
      compliance: evaluation.compliance,
    };
    onSave(obs);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Tare & Net Weighing Test (Clause 4.6 & A.4.6)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {subStep === 1 && 'Step 1 of 4: Apply Tare Load'}
            {subStep === 2 && 'Step 2 of 4: Record Tare Indication'}
            {subStep === 3 && 'Step 3 of 4: Apply Net Test Load'}
            {subStep === 4 && 'Step 4 of 4: Tare Verification Result'}
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
        {/* SUBSTEP 1: APPLY TARE */}
        {subStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block mb-1">
                Instructions
              </span>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                <li>Place a tare container or test load on the platform (typically ~30% Max).</li>
                <li>Activate the tare mechanism (press the TARE key).</li>
                <li>Confirm the net indicator illuminates and the display reads zero net.</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Applied Tare Test Load ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tareLoad}
                  onChange={(e) => setTareLoad(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Recommended test value: ~{(inst.maxCapacity * 0.3).toFixed(2)} {inst.unit}.
              </p>
            </div>
          </div>
        )}

        {/* SUBSTEP 2: RECORD TARE INDICATION */}
        {subStep === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Instructions
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Check the displayed tare value or zero net indication. Enter the value shown.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Indicated Tare Value ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={indicatedTare}
                  onChange={(e) => setIndicatedTare(parseFloat(e.target.value) || 0)}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SUBSTEP 3: NET LOAD */}
        {subStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block mb-1">
                Instructions
              </span>
              <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1">
                <li>With the tare container on the platform, place the net test load inside/on it.</li>
                <li>Wait for the reading to stabilize, then enter the displayed net weight.</li>
              </ol>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Net Test Load ({inst.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={netLoad}
                  onChange={(e) => setNetLoad(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Displayed Net Value ({inst.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  value={indicatedNet}
                  onChange={(e) => setIndicatedNet(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBSTEP 4: RESULT */}
        {subStep === 4 && (
          <div className="space-y-5">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                evaluation.compliance === 'PASS'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {evaluation.compliance === 'PASS' ? (
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                ) : (
                  <XCircle size={24} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {evaluation.compliance === 'PASS' ? 'Tare Test Passed' : 'Tare Test Failed'}
                  </h4>
                  <p className="text-xs opacity-90">
                    Tare setting error and net weighing error are within allowable OIML limits.
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase ${
                  evaluation.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {evaluation.compliance}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Tare Setting Error
                </span>
                <span className="text-base font-bold text-slate-900">
                  {evaluation.calculatedTareError.toFixed(4)} {inst.unit}
                </span>
                <span className="text-[11px] text-slate-500 block">Limit: ≤ 0.25 e</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Corrected Net Error
                </span>
                <span className="text-base font-bold text-slate-900">
                  {(evaluation.evaluatedNetPoints[0]?.correctedNetErrorEc || 0).toFixed(4)} {inst.unit}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Limit: ±{(evaluation.evaluatedNetPoints[0]?.mpeInUnit || 0).toFixed(4)} {inst.unit}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {subStep > 1 ? (
          <button
            onClick={() => setSubStep(subStep - 1)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back
          </button>
        ) : (
          <button
            onClick={onBackToOverview}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Test Plan Overview
          </button>
        )}

        {subStep < 4 ? (
          <button
            onClick={() => setSubStep(subStep + 1)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={isReadOnly}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check size={14} /> Complete Tare Test & Continue
          </button>
        )}
      </div>
    </div>
  );
};
