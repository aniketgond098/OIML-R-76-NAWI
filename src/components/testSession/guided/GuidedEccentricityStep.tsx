import React, { useState } from 'react';
import { TestSession, EccentricityObservation } from '../../../types/testSession';
import {
  calculateEccentricityPosition,
  getRecommendedEccentricityLoad,
} from '../../../metrology/calculations/eccentricity';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, MapPin } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: EccentricityObservation[]) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedEccentricityStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existingObs = session.eccentricityObservations || [];

  const N = inst.numberOfSupportPoints || 4;
  const recommendedInfo = getRecommendedEccentricityLoad(inst.maxCapacity, N);
  const eccentricLoad = Number(recommendedInfo.recommendedLoad.toFixed(3));

  const standardPositions = [
    { id: 1, name: 'Center of platform', short: 'Center', desc: 'Place test load directly in the center of the load receptor' },
    { id: 2, name: 'Corner 1: Front-Left', short: 'Corner 1', desc: 'Place test load at the front-left quarter of the load receptor' },
    { id: 3, name: 'Corner 2: Front-Right', short: 'Corner 2', desc: 'Place test load at the front-right quarter of the load receptor' },
    { id: 4, name: 'Corner 3: Rear-Right', short: 'Corner 3', desc: 'Place test load at the rear-right quarter of the load receptor' },
    { id: 5, name: 'Corner 4: Rear-Left', short: 'Corner 4', desc: 'Place test load at the rear-left quarter of the load receptor' },
  ];

  // Store entered indications for the 5 positions
  const [activePosIndex, setActivePosIndex] = useState<number>(0); // 0 to 4
  const [indications, setIndications] = useState<number[]>(() => {
    if (existingObs.length >= 5) {
      return existingObs.map((o) => o.indicatedValue);
    }
    return [eccentricLoad, eccentricLoad, eccentricLoad, eccentricLoad, eccentricLoad];
  });

  const [viewSummary, setViewSummary] = useState<boolean>(existingObs.length >= 5);

  // Evaluate each position
  const evaluatedPositions = standardPositions.map((pos, idx) => {
    const indicated = indications[idx];
    const res = calculateEccentricityPosition({
      positionId: pos.id,
      positionName: pos.name,
      nominalLoadL: eccentricLoad,
      indicatedValueI: indicated,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      zeroErrorE0: 0,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });
    return {
      ...pos,
      indicated,
      ...res,
    };
  });

  const overallPass = evaluatedPositions.every((p) => p.compliance === 'PASS');

  const handleFinish = () => {
    const finalObservations: EccentricityObservation[] = evaluatedPositions.map((p) => ({
      id: `ecc-obs-${Date.now()}-${p.id}`,
      positionId: p.id,
      positionName: p.name,
      nominalLoad: eccentricLoad,
      indicatedValue: p.indicated,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      calculatedIndicationP: p.calculatedIndicationP,
      errorPriorToRoundingE: p.errorPriorToRoundingE,
      correctedErrorEc: p.correctedErrorEc,
      mpeInUnit: p.mpeInUnit,
      compliance: p.compliance,
    }));
    onSave(finalObservations);
  };

  const currentPos = standardPositions[activePosIndex];
  const currentEval = evaluatedPositions[activePosIndex];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Eccentricity Test (Clause 3.6.2)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewSummary
              ? 'Eccentricity Test Results'
              : `Position ${activePosIndex + 1} of 5: ${currentPos.name}`}
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
            {/* Position Stepper */}
            <div className="flex gap-1.5">
              {standardPositions.map((pos, idx) => (
                <button
                  key={pos.id}
                  onClick={() => setActivePosIndex(idx)}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-center text-[11px] font-bold border transition-colors ${
                    idx === activePosIndex
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : evaluatedPositions[idx].compliance === 'PASS'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {pos.short}
                </button>
              ))}
            </div>

            {/* Instruction Card */}
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                <MapPin size={15} className="text-indigo-600" />
                <span>{currentPos.name}</span>
              </div>
              <p className="text-xs text-slate-700">
                {currentPos.desc}
              </p>
              <div className="p-2.5 bg-white rounded-lg border border-indigo-100 inline-block text-xs">
                <span className="text-slate-500 font-medium">Required reference load:</span>{' '}
                <strong className="text-slate-900 font-mono text-sm">{eccentricLoad} {inst.unit}</strong>{' '}
                <span className="text-[11px] text-slate-400">
                  (OIML recommendation: 1/{N > 1 ? N - 1 : 3} Max)
                </span>
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
                  value={indications[activePosIndex]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const updated = [...indications];
                    updated[activePosIndex] = val;
                    setIndications(updated);
                  }}
                  className="w-full text-lg font-mono font-bold px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                  {inst.unit}
                </span>
              </div>
            </div>

            {/* Instant feedback pill */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">Corrected Error (Ec):</span>
                <strong className="text-slate-900">{currentEval.correctedErrorEc.toFixed(4)} {inst.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">MPE Limit:</span>
                <span className="text-slate-700">±{currentEval.mpeInUnit.toFixed(4)} {inst.unit}</span>
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
                    {overallPass ? 'Eccentricity Test Passed' : 'Eccentricity Test Failed'}
                  </h4>
                  <p className="text-xs opacity-90">
                    All 5 eccentric loading positions are within the maximum permissible error.
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

            {/* List of positions */}
            <div className="space-y-2">
              {evaluatedPositions.map((pos) => (
                <div
                  key={pos.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{pos.name}</span>
                    <span className="text-slate-500 font-mono text-[11px] block">
                      Indication: {pos.indicated.toFixed(3)} {inst.unit} • Error: {pos.correctedErrorEc.toFixed(4)} {inst.unit}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      pos.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {pos.compliance}
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
                if (activePosIndex > 0) {
                  setActivePosIndex(activePosIndex - 1);
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
                if (activePosIndex < standardPositions.length - 1) {
                  setActivePosIndex(activePosIndex + 1);
                } else {
                  setViewSummary(true);
                }
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              {activePosIndex === standardPositions.length - 1 ? 'View Result Summary' : 'Next Position'}{' '}
              <ArrowRight size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewSummary(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Edit Positions
            </button>

            <button
              onClick={handleFinish}
              disabled={isReadOnly}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Complete Eccentricity Test & Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};
