import React, { useState } from 'react';
import { TestSession, ZeroSettingObservation } from '../../../types/testSession';
import { calculateZeroSetting } from '../../../metrology/calculations/zeroSetting';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Scale } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: ZeroSettingObservation) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedZeroStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existing = session.zeroSettingObservation;

  // Internal substep (1: Prepare, 2: Zero Indication, 3: Turning Point, 4: Result)
  const [subStep, setSubStep] = useState<number>(existing ? 4 : 1);

  // Form values
  const [zeroIndication, setZeroIndication] = useState<number>(existing ? existing.zeroIndication : 0);
  const [turningPointDeltaL0, setTurningPointDeltaL0] = useState<number>(
    existing ? existing.turningPointDeltaL0 : 0.5 * inst.actualScaleInterval
  );
  const [prepChecks, setPrepChecks] = useState({
    unloaded: true,
    level: true,
    stable: true,
    zeroPressed: true,
  });

  const [inputError, setInputError] = useState<string | null>(null);

  // Calculate error and compliance
  const evaluation = calculateZeroSetting({
    zeroIndicationI0: zeroIndication,
    turningPointDeltaL0,
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
  });

  const handleFinish = () => {
    const obs: ZeroSettingObservation = {
      testType: 'NON_AUTOMATIC_ZERO_SETTING',
      zeroLoad: 0,
      zeroIndication,
      turningPointDeltaL0,
      calculatedZeroErrorE0: evaluation.calculatedZeroErrorE0,
      maxPermissibleZeroError: evaluation.maxPermissibleZeroError,
      compliance: evaluation.compliance,
    };
    onSave(obs);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Step Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Zero-Setting Accuracy Test
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {subStep === 1 && 'Step 1 of 4: Prepare the Instrument'}
            {subStep === 2 && 'Step 2 of 4: Record Zero Indication'}
            {subStep === 3 && 'Step 3 of 4: Determine Turning Point (ΔL₀)'}
            {subStep === 4 && 'Step 4 of 4: Verification Result'}
          </h3>
        </div>
        <button
          onClick={onWhyClick}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline"
        >
          <HelpCircle size={14} /> Why am I doing this?
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* SUBSTEP 1: PREPARE */}
        {subStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1">
                Before recording the measurement:
              </h4>
              <p className="text-xs text-slate-600">
                Please confirm the following setup requirements on the instrument:
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prepChecks.unloaded}
                  onChange={(e) => setPrepChecks({ ...prepChecks, unloaded: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Load receptor is completely empty and clean
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prepChecks.level}
                  onChange={(e) => setPrepChecks({ ...prepChecks, level: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Level indicator bubble is centered
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prepChecks.stable}
                  onChange={(e) => setPrepChecks({ ...prepChecks, stable: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Display is stable (stability indicator is illuminated)
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prepChecks.zeroPressed}
                  onChange={(e) => setPrepChecks({ ...prepChecks, zeroPressed: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Zero button has been pressed (zero indicator active)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* SUBSTEP 2: RECORD ZERO INDICATION */}
        {subStep === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Instructions
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Confirm that the instrument displays zero. Enter the value shown on the display.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Displayed Zero Indication ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={zeroIndication}
                  onChange={(e) => {
                    setZeroIndication(parseFloat(e.target.value) || 0);
                    setInputError(null);
                  }}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Typical value is 0.000 {inst.unit}.
              </p>
            </div>
          </div>
        )}

        {/* SUBSTEP 3: TURNING POINT ΔL0 */}
        {subStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Instructions
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                Place small weights (e.g. 0.1d increments) on the load receptor until the display changes smoothly to the next scale division (from 0 to +1d). Enter the total additional weight added.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Additional Weight Added (ΔL₀) ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={turningPointDeltaL0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (isNaN(val) || val < 0) {
                      setInputError('Please enter a positive number');
                    } else {
                      setInputError(null);
                      setTurningPointDeltaL0(val);
                    }
                  }}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Default theoretical value: 0.5d = {(0.5 * inst.actualScaleInterval).toFixed(4)} {inst.unit}.
              </p>
            </div>

            {inputError && (
              <p className="text-xs text-rose-600 font-semibold">{inputError}</p>
            )}
          </div>
        )}

        {/* SUBSTEP 4: RESULT */}
        {subStep === 4 && (
          <div className="space-y-5">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              evaluation.compliance === 'PASS'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-3">
                {evaluation.compliance === 'PASS' ? (
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                ) : (
                  <XCircle size={24} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {evaluation.compliance === 'PASS' ? 'Zero-Setting Test Passed' : 'Zero-Setting Test Failed'}
                  </h4>
                  <p className="text-xs opacity-90">
                    Calculated zero error is within the maximum permissible limit under OIML R 76-1:2006.
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase ${
                evaluation.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {evaluation.compliance}
              </span>
            </div>

            {/* Clear comparison metrics */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Calculated Zero Error (E₀)
                </span>
                <span className="text-base font-bold text-slate-900">
                  {evaluation.calculatedZeroErrorE0.toFixed(4)} {inst.unit}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  ({(evaluation.calculatedZeroErrorE0 / inst.verificationScaleInterval).toFixed(2)} e)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-sans font-bold uppercase text-slate-400 block">
                  Maximum Permissible Limit
                </span>
                <span className="text-base font-bold text-slate-900">
                  ±{evaluation.maxPermissibleZeroError.toFixed(4)} {inst.unit}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  (±0.25 e)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
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
            onClick={() => {
              if (subStep === 1) {
                if (!prepChecks.unloaded || !prepChecks.level || !prepChecks.stable || !prepChecks.zeroPressed) {
                  alert('Please confirm all preparation checklist items before continuing.');
                  return;
                }
              }
              setSubStep(subStep + 1);
            }}
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
            <Check size={14} /> Complete Zero Test & Continue
          </button>
        )}
      </div>
    </div>
  );
};
