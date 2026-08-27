import React, { useState } from 'react';
import { TestSession, EccentricityObservation } from '../../../types/testSession';
import {
  calculateEccentricityPosition,
  getRecommendedEccentricityLoad,
} from '../../../metrology/calculations/eccentricity';
import { CalculationModal } from '../../common/CalculationModal';
import { CalculationExplanation } from '../../../types/metrology';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { Plus, Calculator, Info, LayoutGrid } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateObservations: (observations: EccentricityObservation[]) => void;
}

export const EccentricityTestTab: React.FC<Props> = ({ session, isReadOnly, onUpdateObservations }) => {
  const inst = session.instrumentSnapshot;
  const observations = session.eccentricityObservations || [];

  const [selectedExplanation, setSelectedExplanation] = useState<CalculationExplanation | null>(null);

  const N = inst.numberOfSupportPoints || 4;
  const recommendedInfo = getRecommendedEccentricityLoad(inst.maxCapacity, N);
  const standardEccentricLoad = Number(recommendedInfo.recommendedLoad.toFixed(3));

  const handlePopulateStandardPositions = () => {
    const positions = [
      { id: 1, name: 'Pos 1: Center', desc: 'Center of platform' },
      { id: 2, name: 'Pos 2: Top-Left / Front-Left', desc: 'Quarter 1 corner' },
      { id: 3, name: 'Pos 3: Top-Right / Front-Right', desc: 'Quarter 2 corner' },
      { id: 4, name: 'Pos 4: Bottom-Right / Rear-Right', desc: 'Quarter 3 corner' },
      { id: 5, name: 'Pos 5: Bottom-Left / Rear-Left', desc: 'Quarter 4 corner' },
    ];

    const newObs: EccentricityObservation[] = positions.map((p) => {
      const evalRes = calculateEccentricityPosition({
        positionId: p.id,
        positionName: p.name,
        nominalLoadL: standardEccentricLoad,
        indicatedValueI: standardEccentricLoad,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        zeroErrorE0: 0,
        verificationScaleIntervalE: inst.verificationScaleInterval,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
      });

      return {
        id: `ecc-obs-${Date.now()}-${p.id}`,
        positionId: p.id,
        positionName: p.name,
        nominalLoad: standardEccentricLoad,
        indicatedValue: standardEccentricLoad,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        calculatedIndicationP: evalRes.calculatedIndicationP,
        errorPriorToRoundingE: evalRes.errorPriorToRoundingE,
        correctedErrorEc: evalRes.correctedErrorEc,
        mpeInUnit: evalRes.mpeInUnit,
        compliance: evalRes.compliance,
      };
    });

    onUpdateObservations(newObs);
  };

  const handleFieldChange = (
    index: number,
    field: 'indicatedValue' | 'turningPointDeltaL' | 'nominalLoad',
    value: number
  ) => {
    const updated = [...observations];
    const item = { ...updated[index], [field]: value };

    const evalRes = calculateEccentricityPosition({
      positionId: item.positionId,
      positionName: item.positionName,
      nominalLoadL: item.nominalLoad,
      indicatedValueI: item.indicatedValue,
      turningPointDeltaL: item.turningPointDeltaL,
      zeroErrorE0: 0,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });

    item.calculatedIndicationP = evalRes.calculatedIndicationP;
    item.errorPriorToRoundingE = evalRes.errorPriorToRoundingE;
    item.correctedErrorEc = evalRes.correctedErrorEc;
    item.mpeInUnit = evalRes.mpeInUnit;
    item.compliance = evalRes.compliance;

    updated[index] = item;
    onUpdateObservations(updated);
  };

  return (
    <div id="eccentricity-test-tab" className="space-y-6">
      {/* Clause Reference Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Clause 3.6.2 & A.4.7: Eccentric Loading Test
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Prescribed test load = {recommendedInfo.formulaUsed} = {standardEccentricLoad} {inst.unit} placed sequentially on center and quarter sectors.
          </p>
        </div>

        {!isReadOnly && observations.length === 0 && (
          <button
            id="btn-populate-eccentricity-positions"
            onClick={handlePopulateStandardPositions}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <Plus size={14} /> + Generate 5 Standard Positions
          </button>
        )}
      </div>

      {/* Visual Platform Schematic & Position Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <LayoutGrid size={14} /> Platform Position Map
          </h5>

          {/* Scale Plate Visual Grid */}
          <div className="w-48 h-48 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 p-2 relative shadow-inner">
            {/* Center Pos 1 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-indigo-100 border-2 border-indigo-600 flex items-center justify-center font-bold text-xs text-indigo-700 shadow-xs">
              1
            </div>

            {/* Corner Pos 2 (Top Left) */}
            <div className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-slate-200 border border-slate-400 flex items-center justify-center font-bold text-xs text-slate-700">
              2
            </div>

            {/* Corner Pos 3 (Top Right) */}
            <div className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-slate-200 border border-slate-400 flex items-center justify-center font-bold text-xs text-slate-700">
              3
            </div>

            {/* Corner Pos 4 (Bottom Right) */}
            <div className="absolute bottom-3 right-3 w-9 h-9 rounded-lg bg-slate-200 border border-slate-400 flex items-center justify-center font-bold text-xs text-slate-700">
              4
            </div>

            {/* Corner Pos 5 (Bottom Left) */}
            <div className="absolute bottom-3 left-3 w-9 h-9 rounded-lg bg-slate-200 border border-slate-400 flex items-center justify-center font-bold text-xs text-slate-700">
              5
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 leading-tight">
            Apply test load sequentially to Center (1), Front-Left (2), Front-Right (3), Rear-Right (4), Rear-Left (5).
          </p>
        </div>

        {/* Positions Table */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className="p-3 pl-4">Pos #</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Applied Load</th>
                  <th className="p-3">Indication ($I$)</th>
                  <th className="p-3">$\Delta L$</th>
                  <th className="p-3">Error ($E_c$)</th>
                  <th className="p-3">MPE Limit</th>
                  <th className="p-3">Result</th>
                  <th className="p-3 pr-4 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {observations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-sans text-xs">
                      No eccentricity positions recorded. Click "+ Generate 5 Standard Positions" above.
                    </td>
                  </tr>
                ) : (
                  observations.map((obs, idx) => {
                    const explanation = calculateEccentricityPosition({
                      positionId: obs.positionId,
                      positionName: obs.positionName,
                      nominalLoadL: obs.nominalLoad,
                      indicatedValueI: obs.indicatedValue,
                      turningPointDeltaL: obs.turningPointDeltaL,
                      zeroErrorE0: 0,
                      verificationScaleIntervalE: inst.verificationScaleInterval,
                      unit: inst.unit,
                      accuracyClass: inst.accuracyClass,
                    }).explanation;

                    return (
                      <tr key={obs.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 pl-4 font-sans font-bold text-indigo-700">#{obs.positionId}</td>
                        <td className="p-3 font-sans text-slate-800 font-semibold">{obs.positionName}</td>
                        <td className="p-3">
                          {isReadOnly ? (
                            <span>{obs.nominalLoad} {inst.unit}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={obs.nominalLoad}
                              onChange={(e) =>
                                handleFieldChange(idx, 'nominalLoad', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          {isReadOnly ? (
                            <span className="font-bold text-slate-900">{obs.indicatedValue} {inst.unit}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={obs.indicatedValue}
                              onChange={(e) =>
                                handleFieldChange(idx, 'indicatedValue', parseFloat(e.target.value) || 0)
                              }
                              className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs font-bold"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          {isReadOnly ? (
                            <span>{obs.turningPointDeltaL ?? '-'}</span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              placeholder="0.5d"
                              value={obs.turningPointDeltaL ?? ''}
                              onChange={(e) =>
                                handleFieldChange(idx, 'turningPointDeltaL', parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                          )}
                        </td>
                        <td className="p-3 font-bold">
                          {obs.correctedErrorEc !== undefined ? (
                            <span className={obs.compliance === 'PASS' ? 'text-emerald-700' : 'text-rose-700'}>
                              {obs.correctedErrorEc > 0 ? `+${obs.correctedErrorEc.toFixed(4)}` : obs.correctedErrorEc.toFixed(4)} {inst.unit}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : '-'}
                        </td>
                        <td className="p-3">
                          <ComplianceBadge status={obs.compliance} size="sm" />
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <button
                            onClick={() => setSelectedExplanation(explanation)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                            title="View Mathematical Proof"
                          >
                            <Calculator size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Proof Modal */}
      <CalculationModal
        isOpen={Boolean(selectedExplanation)}
        onClose={() => setSelectedExplanation(null)}
        explanation={selectedExplanation}
      />
    </div>
  );
};
