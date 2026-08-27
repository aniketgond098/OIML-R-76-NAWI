import React, { useState } from 'react';
import { TestSession, WeighingTestObservation } from '../../../types/testSession';
import { calculateWeighingError } from '../../../metrology/calculations/weighing';
import { CalculationModal } from '../../common/CalculationModal';
import { CalculationExplanation } from '../../../types/metrology';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { Plus, Trash2, Calculator, Info, LineChart as ChartIcon, CheckCircle2, XCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateObservations: (observations: WeighingTestObservation[]) => void;
}

export const WeighingTestTab: React.FC<Props> = ({ session, isReadOnly, onUpdateObservations }) => {
  const inst = session.instrumentSnapshot;
  const observations = session.weighingObservations || [];

  const [selectedExplanation, setSelectedExplanation] = useState<CalculationExplanation | null>(null);
  const [showChart, setShowChart] = useState(true);

  // Helper to re-evaluate zero error E0
  const zeroObs = observations.find((o) => o.nominalLoad === 0 && o.direction === 'ASCENDING');
  const zeroErrorE0 = zeroObs
    ? zeroObs.turningPointDeltaL !== undefined
      ? calculateWeighingError({
          nominalLoadL: 0,
          indicatedValueI: zeroObs.indicatedValue,
          verificationScaleIntervalE: inst.verificationScaleInterval,
          unit: inst.unit,
          accuracyClass: inst.accuracyClass,
          turningPointDeltaL: zeroObs.turningPointDeltaL,
          zeroErrorE0: 0,
        }).errorPriorToRoundingE
      : 0
    : 0;

  // Add default OIML test load points
  const handleAddDefaultPoints = () => {
    const e = inst.verificationScaleInterval;
    const max = inst.maxCapacity;
    const min = inst.minCapacity;

    const defaultPoints = [
      { load: 0, dir: 'ASCENDING' as const },
      { load: min, dir: 'ASCENDING' as const },
      { load: Math.min(500 * e, max * 0.25), dir: 'ASCENDING' as const },
      { load: Math.min(2000 * e, max * 0.5), dir: 'ASCENDING' as const },
      { load: max, dir: 'ASCENDING' as const },
      { load: Math.min(2000 * e, max * 0.5), dir: 'DESCENDING' as const },
      { load: min, dir: 'DESCENDING' as const },
      { load: 0, dir: 'DESCENDING' as const },
    ];

    const newObs: WeighingTestObservation[] = defaultPoints.map((pt, idx) => {
      const evalRes = calculateWeighingError({
        nominalLoadL: pt.load,
        indicatedValueI: pt.load,
        verificationScaleIntervalE: inst.verificationScaleInterval,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        zeroErrorE0: 0,
      });

      return {
        id: `obs-w-${Date.now()}-${idx}`,
        testPointIndex: idx + 1,
        nominalLoad: pt.load,
        indicatedValue: pt.load,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        direction: pt.dir,
        calculatedIndicationP: evalRes.calculatedIndicationP,
        errorPriorToRoundingE: evalRes.errorPriorToRoundingE,
        zeroErrorE0: 0,
        correctedErrorEc: evalRes.correctedErrorEc,
        mpeE: evalRes.mpeE,
        mpeInUnit: evalRes.mpeInUnit,
        compliance: evalRes.compliance,
      };
    });

    onUpdateObservations(newObs);
  };

  const handleFieldChange = (
    index: number,
    field: 'nominalLoad' | 'indicatedValue' | 'turningPointDeltaL' | 'direction',
    value: any
  ) => {
    const updated = [...observations];
    const item = { ...updated[index], [field]: value };

    // Re-evaluate point
    const evalRes = calculateWeighingError({
      nominalLoadL: Number(item.nominalLoad),
      indicatedValueI: Number(item.indicatedValue),
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      turningPointDeltaL: item.turningPointDeltaL !== undefined ? Number(item.turningPointDeltaL) : undefined,
      zeroErrorE0: zeroErrorE0,
    });

    item.calculatedIndicationP = evalRes.calculatedIndicationP;
    item.errorPriorToRoundingE = evalRes.errorPriorToRoundingE;
    item.zeroErrorE0 = zeroErrorE0;
    item.correctedErrorEc = evalRes.correctedErrorEc;
    item.mpeE = evalRes.mpeE;
    item.mpeInUnit = evalRes.mpeInUnit;
    item.compliance = evalRes.compliance;

    updated[index] = item;
    onUpdateObservations(updated);
  };

  const handleAddRow = () => {
    const nextIdx = observations.length + 1;
    const newRow: WeighingTestObservation = {
      id: `obs-w-${Date.now()}-${nextIdx}`,
      testPointIndex: nextIdx,
      nominalLoad: inst.maxCapacity / 2,
      indicatedValue: inst.maxCapacity / 2,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      direction: 'ASCENDING',
      compliance: 'NOT_EVALUATED',
    };

    const evalRes = calculateWeighingError({
      nominalLoadL: newRow.nominalLoad,
      indicatedValueI: newRow.indicatedValue,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      turningPointDeltaL: newRow.turningPointDeltaL,
      zeroErrorE0: zeroErrorE0,
    });

    newRow.calculatedIndicationP = evalRes.calculatedIndicationP;
    newRow.errorPriorToRoundingE = evalRes.errorPriorToRoundingE;
    newRow.zeroErrorE0 = zeroErrorE0;
    newRow.correctedErrorEc = evalRes.correctedErrorEc;
    newRow.mpeE = evalRes.mpeE;
    newRow.mpeInUnit = evalRes.mpeInUnit;
    newRow.compliance = evalRes.compliance;

    onUpdateObservations([...observations, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = observations.filter((_, i) => i !== index);
    updated.forEach((obs, idx) => (obs.testPointIndex = idx + 1));
    onUpdateObservations(updated);
  };

  // Prepare chart dataset
  const chartData = observations
    .map((obs) => ({
      load: obs.nominalLoad,
      error: obs.correctedErrorEc ?? 0,
      posMpe: obs.mpeInUnit ?? 0,
      negMpe: obs.mpeInUnit ? -obs.mpeInUnit : 0,
      name: `${obs.nominalLoad} ${inst.unit} (${obs.direction === 'ASCENDING' ? '↑' : '↓'})`,
    }))
    .sort((a, b) => a.load - b.load);

  return (
    <div id="weighing-test-tab" className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Clause 3.5.1 & A.4.4.3: Weighing Performance & Turning Point Method
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Test with at least 5 distributed test loads (Min, 500e, 2000e, Max) in ascending and descending steps.
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex items-center gap-2">
            {observations.length === 0 && (
              <button
                id="btn-add-default-weighing-points"
                onClick={handleAddDefaultPoints}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs border border-indigo-200 transition-colors"
              >
                + Generate OIML Load Points
              </button>
            )}
            <button
              id="btn-add-weighing-row"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
            >
              <Plus size={14} /> Add Test Point
            </button>
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
              title="Toggle Error Envelope Chart"
            >
              <ChartIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Visual Error Envelope Chart */}
      {showChart && chartData.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              OIML Table 6 Error Curve & MPE Tolerance Envelope
            </h5>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-500 inline-block border-t border-dashed border-rose-500" />
                <span className="text-slate-500">MPE Envelope (±Limit)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-indigo-600 inline-block" />
                <span className="text-slate-800 font-bold">Observed Error (Ec)</span>
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="load"
                  tick={{ fontSize: 10 }}
                  unit={` ${inst.unit}`}
                  label={{ value: `Test Load (${inst.unit})`, position: 'bottom', offset: 5, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  unit={` ${inst.unit}`}
                  label={{ value: `Error (${inst.unit})`, angle: -90, position: 'left', offset: -5, fontSize: 10 }}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    `${typeof val === 'number' ? val.toFixed(5) : val} ${inst.unit}`,
                    name === 'error' ? 'Corrected Error (Ec)' : name === 'posMpe' ? '+MPE Limit' : '-MPE Limit',
                  ]}
                  labelFormatter={(load) => `Load: ${load} ${inst.unit}`}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                <Line type="stepAfter" dataKey="posMpe" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="negMpe" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="error" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Observations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                <th className="p-3 pl-4">#</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Nominal Load ($L$)</th>
                <th className="p-3">Indication ($I$)</th>
                <th className="p-3">Flash Weight ($\Delta L$)</th>
                <th className="p-3">True Indic. ($P$)</th>
                <th className="p-3">Error ($E_c$)</th>
                <th className="p-3">MPE Limit</th>
                <th className="p-3">Result</th>
                <th className="p-3 pr-4 text-right">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {observations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans text-xs">
                    No weighing test observations recorded. Click "+ Generate OIML Load Points" above to begin.
                  </td>
                </tr>
              ) : (
                observations.map((obs, idx) => {
                  const explanation = calculateWeighingError({
                    nominalLoadL: obs.nominalLoad,
                    indicatedValueI: obs.indicatedValue,
                    verificationScaleIntervalE: inst.verificationScaleInterval,
                    unit: inst.unit,
                    accuracyClass: inst.accuracyClass,
                    turningPointDeltaL: obs.turningPointDeltaL,
                    zeroErrorE0: zeroErrorE0,
                  }).explanation;

                  return (
                    <tr key={obs.id || idx} className="hover:bg-slate-50">
                      <td className="p-3 pl-4 text-slate-500 font-sans">{obs.testPointIndex}</td>

                      <td className="p-3 font-sans">
                        {isReadOnly ? (
                          <span className="font-semibold text-slate-700">
                            {obs.direction === 'ASCENDING' ? '↑ Asc' : '↓ Desc'}
                          </span>
                        ) : (
                          <select
                            value={obs.direction}
                            onChange={(e) => handleFieldChange(idx, 'direction', e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                          >
                            <option value="ASCENDING">↑ Ascending</option>
                            <option value="DESCENDING">↓ Descending</option>
                          </select>
                        )}
                      </td>

                      <td className="p-3">
                        {isReadOnly ? (
                          <span className="font-bold text-slate-900">{obs.nominalLoad} {inst.unit}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={obs.nominalLoad}
                              onChange={(e) => handleFieldChange(idx, 'nominalLoad', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                            <span className="text-slate-400 font-sans">{inst.unit}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {isReadOnly ? (
                          <span className="text-slate-800">{obs.indicatedValue} {inst.unit}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={obs.indicatedValue}
                              onChange={(e) => handleFieldChange(idx, 'indicatedValue', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                            />
                            <span className="text-slate-400 font-sans">{inst.unit}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {isReadOnly ? (
                          <span className="text-slate-600">{obs.turningPointDeltaL ?? '-'}</span>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            placeholder="0.5d"
                            value={obs.turningPointDeltaL ?? ''}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                'turningPointDeltaL',
                                e.target.value === '' ? undefined : parseFloat(e.target.value)
                              )
                            }
                            className="w-20 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                          />
                        )}
                      </td>

                      <td className="p-3 text-slate-700">
                        {obs.calculatedIndicationP !== undefined ? obs.calculatedIndicationP.toFixed(4) : '-'}
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
                        {obs.mpeInUnit !== undefined ? `±${obs.mpeInUnit.toFixed(4)} ${inst.unit}` : `±${obs.mpeE}e`}
                      </td>

                      <td className="p-3">
                        <ComplianceBadge status={obs.compliance} size="sm" />
                      </td>

                      <td className="p-3 pr-4 text-right space-x-1 font-sans">
                        <button
                          onClick={() => setSelectedExplanation(explanation)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                          title="View Traceability Proof"
                        >
                          <Calculator size={14} />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Point"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mathematical Proof Modal */}
      <CalculationModal
        isOpen={Boolean(selectedExplanation)}
        onClose={() => setSelectedExplanation(null)}
        explanation={selectedExplanation}
      />
    </div>
  );
};
