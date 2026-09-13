import React, { useState } from 'react';
import { TestSession, DiscriminationObservation } from '../../../types/testSession';
import { calculateDiscrimination } from '../../../metrology/calculations/discrimination';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Eye, SkipForward, Calculator } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: DiscriminationObservation) => void;
  onSkip?: () => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedDiscriminationStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onSkip,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existing = session.discriminationObservation;

  // Scale interval d and max capacity
  const d = inst.actualScaleInterval || inst.verificationScaleInterval || 1;
  const extraLoadRequired = 1.4 * d;

  // Standard recommended test load L (e.g. 50% Max or near Min)
  const defaultNominalL = existing?.nominalLoadL ?? Math.round((inst.maxCapacity * 0.5) / d) * d;

  const [nominalLoadL, setNominalLoadL] = useState<number>(defaultNominalL);
  const [initialIndicationI1, setInitialIndicationI1] = useState<number>(existing?.initialIndicationI1 ?? defaultNominalL);
  const [appliedExtraLoad, setAppliedExtraLoad] = useState<number>(existing?.actualExtraLoadApplied ?? extraLoadRequired);
  const [indicationAfterLoadI2, setIndicationAfterLoadI2] = useState<number>(
    existing?.indicationAfterLoadI2 ?? (existing?.initialIndicationI1 ?? defaultNominalL) + d
  );

  // Real-time calculation
  const evaluation = calculateDiscrimination({
    nominalLoadL,
    initialIndicationI1,
    actualScaleIntervalD: d,
    additionalLoadApplied: appliedExtraLoad,
    indicationAfterAdditionalLoadI2: indicationAfterLoadI2,
    unit: inst.unit,
  });

  const isCompliant = evaluation.compliance === 'PASS';

  const handleFinish = () => {
    const obs: DiscriminationObservation = {
      nominalLoadL,
      initialIndicationI1,
      actualScaleIntervalD: d,
      extraLoadRequired,
      actualExtraLoadApplied: appliedExtraLoad,
      indicationAfterLoadI2,
      indicationChangeDeltaI: evaluation.indicationChangeDeltaI,
      minimumRequiredChange: evaluation.minimumRequiredChange,
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
            Clause 3.8.2.2 & A.4.8: Discrimination Test
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Digital Indication Threshold (1.4 d Additional Load)
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
        {/* Metrological Guidance Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <Eye size={15} />
            <span>OIML Test Procedure: Clause 3.8.2.2</span>
          </div>
          <p className="text-indigo-900/90 leading-relaxed">
            While the instrument is at rest under load <strong className="font-mono">{nominalLoadL} {inst.unit}</strong>,
            gently apply an extra test weight equal to <strong>1.4 d ({extraLoadRequired.toFixed(4)} {inst.unit})</strong>.
            The displayed indication must increase by at least <strong>1.0 d ({d} {inst.unit})</strong> (i.e. <span className="font-mono font-bold">ΔI ≥ 1.0 d</span>).
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nominal Load */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Base Nominal Test Load (L)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={nominalLoadL}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setNominalLoadL(val);
                    setInitialIndicationI1(val);
                    setIndicationAfterLoadI2(val + d);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Typically ~50% Max or routine operating load
              </span>
            </div>

            {/* Initial Indication I1 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Initial Indication (I₁)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={initialIndicationI1}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setInitialIndicationI1(val);
                    setIndicationAfterLoadI2(val + d);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Reading displayed prior to extra load
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Extra Load Applied (1.4 d) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Load Applied (1.4 d)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={appliedExtraLoad}
                  onChange={(e) => setAppliedExtraLoad(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-amber-50/40"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                Required: 1.4 × d = {extraLoadRequired.toFixed(4)} {inst.unit}
              </span>
            </div>

            {/* Indication After Extra Load I2 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Indication After Load (I₂)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={indicationAfterLoadI2}
                  onChange={(e) => setIndicationAfterLoadI2(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Displayed indication with 1.4 d extra load
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Calculation & Compliance Result Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={14} className="text-indigo-600" />
              Clause 3.8.2 Evaluation: ΔI = I₂ - I₁
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                isCompliant
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isCompliant ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {evaluation.compliance} (ΔI ≥ 1.0 d)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Observed Change (ΔI)
              </span>
              <span className="text-base font-bold text-slate-900">
                {evaluation.indicationChangeDeltaI.toFixed(4)} {inst.unit}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Required Change (1.0 d)
              </span>
              <span className="text-base font-bold text-slate-900">
                ≥ {evaluation.minimumRequiredChange.toFixed(4)} {inst.unit}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Scale Interval (d)
              </span>
              <span className="text-base font-bold text-indigo-700">
                {d} {inst.unit}
              </span>
            </div>
          </div>
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
                <span>Save Discrimination & Continue</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
