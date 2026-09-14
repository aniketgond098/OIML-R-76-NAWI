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
    { id: 1, letter: 'A', name: 'Position A: Center', short: 'Pos A (Center)', desc: 'Place test load directly in the center of the platform', x: '50%', y: '50%' },
    { id: 2, letter: 'B', name: 'Position B: Front-Left', short: 'Pos B (Front-L)', desc: 'Place test load at the front-left quarter of the platform', x: '25%', y: '75%' },
    { id: 3, letter: 'C', name: 'Position C: Front-Right', short: 'Pos C (Front-R)', desc: 'Place test load at the front-right quarter of the platform', x: '75%', y: '75%' },
    { id: 4, letter: 'D', name: 'Position D: Rear-Right', short: 'Pos D (Rear-R)', desc: 'Place test load at the rear-right quarter of the platform', x: '75%', y: '25%' },
    { id: 5, letter: 'E', name: 'Position E: Rear-Left', short: 'Pos E (Rear-L)', desc: 'Place test load at the rear-left quarter of the platform', x: '25%', y: '25%' },
  ];

  // Store entered indications for the 5 positions
  const [activePosIndex, setActivePosIndex] = useState<number>(0); // 0 to 4
  const [showAllModal, setShowAllModal] = useState<boolean>(false);
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
            Off-Centre Load / Eccentricity Test (Clause 3.6.2)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            {viewSummary
              ? 'Eccentricity Test — Results Summary'
              : `Position ${currentPos.letter}: ${currentPos.name}`}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            View All Positions
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
            {/* Position Stepper */}
            <div className="flex gap-1.5">
              {standardPositions.map((pos, idx) => (
                <button
                  key={pos.id}
                  onClick={() => setActivePosIndex(idx)}
                  className={`flex-1 py-2 px-1 rounded-xl text-center text-xs font-bold border transition-colors ${
                    idx === activePosIndex
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : evaluatedPositions[idx].compliance === 'PASS'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Pos {pos.letter}
                </button>
              ))}
            </div>

            {/* WHAT TO DO Instruction Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">What To Do</h4>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>Place the required test load (<strong className="text-slate-900">{eccentricLoad} {inst.unit}</strong>) at <strong className="text-indigo-600">{currentPos.name}</strong>.</li>
                <li>Wait for the reading to stabilize.</li>
                <li>Enter the displayed indication value.</li>
                <li>Press <strong className="text-indigo-600">Save & Continue</strong> to record and advance.</li>
              </ol>
            </div>

            {/* Visual Platform Diagram */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Load Receptor Platform Diagram</span>
                <span>Active: <strong className="text-indigo-400">Position {currentPos.letter}</strong></span>
              </div>
              
              <div className="relative w-full max-w-[280px] h-48 mx-auto bg-slate-800/80 rounded-xl border-2 border-dashed border-slate-600 p-2 flex items-center justify-center">
                {/* Platform grid lines */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-20 pointer-events-none">
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* Platform nodes */}
                {standardPositions.map((pos, idx) => {
                  const isActive = idx === activePosIndex;
                  const isDone = evaluatedPositions[idx].compliance === 'PASS';
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setActivePosIndex(idx)}
                      style={{ left: pos.x, top: pos.y }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex flex-col items-center justify-center font-bold text-xs transition-all shadow-md ${
                        isActive
                          ? 'bg-indigo-500 text-white ring-4 ring-indigo-400/40 scale-110 z-10'
                          : isDone
                          ? 'bg-emerald-600 text-white hover:scale-105'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span>{pos.letter}</span>
                      {isDone && !isActive && <span className="text-[8px]">✓</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-[11px] text-slate-400 pt-1">
                {currentPos.desc} (Required load: <strong className="text-white font-mono">{eccentricLoad} {inst.unit}</strong>)
              </p>
            </div>

            {/* Measurement Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Displayed Indication at Position {currentPos.letter} ({inst.unit})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={indications[activePosIndex]}
                  disabled={isReadOnly}
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
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">Corrected Error (Ec):</span>
                <strong className="text-slate-900 text-sm">{currentEval.correctedErrorEc.toFixed(4)} {inst.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-sans text-[11px] block">MPE Limit:</span>
                <span className="text-slate-700">±{currentEval.mpeInUnit.toFixed(4)} {inst.unit}</span>
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{activePosIndex === standardPositions.length - 1 ? 'Save & Review Summary' : 'Save & Continue'}</span>
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={14} /> Complete Eccentricity Test & Continue
            </button>
          </>
        )}
      </div>

      {/* Optional "View All Positions" Modal */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">All Eccentricity Platform Positions</h4>
                <p className="text-xs text-slate-500">Summary table across all 5 test positions</p>
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
                    <th className="py-2 px-3">Position</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Load</th>
                    <th className="py-2 px-3">Indication</th>
                    <th className="py-2 px-3">Error (Ec)</th>
                    <th className="py-2 px-3">MPE</th>
                    <th className="py-2 px-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {evaluatedPositions.map((pos, idx) => (
                    <tr
                      key={pos.id}
                      className={`hover:bg-slate-50/80 cursor-pointer ${idx === activePosIndex ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => {
                        setActivePosIndex(idx);
                        setShowAllModal(false);
                      }}
                    >
                      <td className="py-2 px-3 font-sans font-bold">Pos {pos.letter}</td>
                      <td className="py-2 px-3 font-sans text-slate-600">{pos.name.split(': ')[1]}</td>
                      <td className="py-2 px-3">{eccentricLoad} {inst.unit}</td>
                      <td className="py-2 px-3 font-bold">{pos.indicated} {inst.unit}</td>
                      <td className="py-2 px-3">{pos.correctedErrorEc.toFixed(4)}</td>
                      <td className="py-2 px-3">±{pos.mpeInUnit.toFixed(4)}</td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pos.compliance === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {pos.compliance}
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
