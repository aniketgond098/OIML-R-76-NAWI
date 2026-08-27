import React, { useState } from 'react';
import { TestSession, RepeatabilitySeries } from '../../../types/testSession';
import { calculateRepeatability } from '../../../metrology/calculations/repeatability';
import { CalculationModal } from '../../common/CalculationModal';
import { CalculationExplanation } from '../../../types/metrology';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { Plus, Trash2, Calculator, Info, RefreshCw } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateSeries: (series: RepeatabilitySeries[]) => void;
}

export const RepeatabilityTestTab: React.FC<Props> = ({ session, isReadOnly, onUpdateSeries }) => {
  const inst = session.instrumentSnapshot;
  const seriesList = session.repeatabilitySeries || [];

  const [selectedExplanation, setSelectedExplanation] = useState<CalculationExplanation | null>(null);

  const handleAddDefaultSeries = () => {
    const halfMax = Number((inst.maxCapacity * 0.5).toFixed(3));
    const fullMax = inst.maxCapacity;

    const createSeries = (load: number, seriesNum: number): RepeatabilitySeries => {
      const readings = [1, 2, 3].map((run) => ({
        runIndex: run,
        zeroIndication: 0,
        indicatedValue: load,
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
      }));

      const evalRes = calculateRepeatability({
        nominalLoadL: load,
        readings,
        verificationScaleIntervalE: inst.verificationScaleInterval,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
      });

      return {
        id: `rep-series-${Date.now()}-${seriesNum}`,
        seriesNumber: seriesNum,
        nominalLoad: load,
        readings,
        maxIndication: evalRes.maxIndication,
        minIndication: evalRes.minIndication,
        deltaI: evalRes.deltaI,
        meanIndication: evalRes.meanIndication,
        stdDeviation: evalRes.stdDeviation,
        mpeInUnit: evalRes.mpeInUnit,
        compliance: evalRes.compliance,
      };
    };

    onUpdateSeries([
      createSeries(halfMax, 1),
      createSeries(fullMax, 2),
    ]);
  };

  const handleReadingChange = (
    seriesIdx: number,
    readingIdx: number,
    field: 'indicatedValue' | 'turningPointDeltaL' | 'zeroIndication',
    value: number
  ) => {
    const updatedSeriesList = [...seriesList];
    const targetSeries = { ...updatedSeriesList[seriesIdx] };
    const updatedReadings = [...targetSeries.readings];

    updatedReadings[readingIdx] = {
      ...updatedReadings[readingIdx],
      [field]: value,
    };

    targetSeries.readings = updatedReadings;

    // Re-evaluate series compliance
    const evalRes = calculateRepeatability({
      nominalLoadL: targetSeries.nominalLoad,
      readings: updatedReadings,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });

    targetSeries.maxIndication = evalRes.maxIndication;
    targetSeries.minIndication = evalRes.minIndication;
    targetSeries.deltaI = evalRes.deltaI;
    targetSeries.meanIndication = evalRes.meanIndication;
    targetSeries.stdDeviation = evalRes.stdDeviation;
    targetSeries.mpeInUnit = evalRes.mpeInUnit;
    targetSeries.compliance = evalRes.compliance;

    updatedSeriesList[seriesIdx] = targetSeries;
    onUpdateSeries(updatedSeriesList);
  };

  const handleAddReading = (seriesIdx: number) => {
    const targetSeries = { ...seriesList[seriesIdx] };
    const nextRun = targetSeries.readings.length + 1;

    const newReading = {
      runIndex: nextRun,
      zeroIndication: 0,
      indicatedValue: targetSeries.nominalLoad,
      turningPointDeltaL: 0.5 * inst.actualScaleInterval,
    };

    targetSeries.readings = [...targetSeries.readings, newReading];

    const evalRes = calculateRepeatability({
      nominalLoadL: targetSeries.nominalLoad,
      readings: targetSeries.readings,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });

    targetSeries.maxIndication = evalRes.maxIndication;
    targetSeries.minIndication = evalRes.minIndication;
    targetSeries.deltaI = evalRes.deltaI;
    targetSeries.meanIndication = evalRes.meanIndication;
    targetSeries.stdDeviation = evalRes.stdDeviation;
    targetSeries.mpeInUnit = evalRes.mpeInUnit;
    targetSeries.compliance = evalRes.compliance;

    const updated = [...seriesList];
    updated[seriesIdx] = targetSeries;
    onUpdateSeries(updated);
  };

  const handleRemoveReading = (seriesIdx: number, readingIdx: number) => {
    const targetSeries = { ...seriesList[seriesIdx] };
    if (targetSeries.readings.length <= 1) return;

    targetSeries.readings = targetSeries.readings.filter((_, i) => i !== readingIdx);
    targetSeries.readings.forEach((r, idx) => (r.runIndex = idx + 1));

    const evalRes = calculateRepeatability({
      nominalLoadL: targetSeries.nominalLoad,
      readings: targetSeries.readings,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });

    targetSeries.maxIndication = evalRes.maxIndication;
    targetSeries.minIndication = evalRes.minIndication;
    targetSeries.deltaI = evalRes.deltaI;
    targetSeries.meanIndication = evalRes.meanIndication;
    targetSeries.stdDeviation = evalRes.stdDeviation;
    targetSeries.mpeInUnit = evalRes.mpeInUnit;
    targetSeries.compliance = evalRes.compliance;

    const updated = [...seriesList];
    updated[seriesIdx] = targetSeries;
    onUpdateSeries(updated);
  };

  return (
    <div id="repeatability-test-tab" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Clause 3.6.1 & A.4.10: Repeatability (ΔI ≤ |MPE|)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Two series of weighings: one with load at 0.5 Max, one at Max (minimum 3 weighings per series for Class III).
          </p>
        </div>

        {!isReadOnly && seriesList.length === 0 && (
          <button
            id="btn-add-default-repeatability-series"
            onClick={handleAddDefaultSeries}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <Plus size={14} /> + Generate Standard Series (0.5 Max & Max)
          </button>
        )}
      </div>

      {/* Series Cards */}
      {seriesList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          No repeatability series recorded. Click "+ Generate Standard Series" above to initialize test series.
        </div>
      ) : (
        <div className="space-y-6">
          {seriesList.map((series, sIdx) => {
            const explanation = calculateRepeatability({
              nominalLoadL: series.nominalLoad,
              readings: series.readings,
              verificationScaleIntervalE: inst.verificationScaleInterval,
              unit: inst.unit,
              accuracyClass: inst.accuracyClass,
            }).explanation;

            return (
              <div
                key={series.id || sIdx}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Series Header */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      Series {series.seriesNumber || sIdx + 1} ({series.nominalLoad} {inst.unit})
                    </span>
                    <ComplianceBadge status={series.compliance} size="sm" />
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-600">
                      ΔI: <strong className="text-slate-900">{series.deltaI.toFixed(4)} {inst.unit}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">
                      MPE: <strong className="text-slate-900">±{series.mpeInUnit.toFixed(4)} {inst.unit}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <button
                      onClick={() => setSelectedExplanation(explanation)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-sans font-semibold"
                    >
                      <Calculator size={13} /> View Proof
                    </button>
                  </div>
                </div>

                {/* Readings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <th className="p-2.5 pl-4">Run #</th>
                        <th className="p-2.5">Zero Indication Before</th>
                        <th className="p-2.5">Indicated Value ($I_n$)</th>
                        <th className="p-2.5">Turning Point ($\Delta L$)</th>
                        <th className="p-2.5 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {series.readings.map((reading, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          <td className="p-2.5 pl-4 font-sans font-semibold text-slate-600">
                            Run #{reading.runIndex}
                          </td>
                          <td className="p-2.5">
                            {isReadOnly ? (
                              <span>{reading.zeroIndication} {inst.unit}</span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                value={reading.zeroIndication}
                                onChange={(e) =>
                                  handleReadingChange(sIdx, rIdx, 'zeroIndication', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                              />
                            )}
                          </td>
                          <td className="p-2.5">
                            {isReadOnly ? (
                              <span className="font-bold text-slate-800">{reading.indicatedValue} {inst.unit}</span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                value={reading.indicatedValue}
                                onChange={(e) =>
                                  handleReadingChange(sIdx, rIdx, 'indicatedValue', parseFloat(e.target.value) || 0)
                                }
                                className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs font-bold"
                              />
                            )}
                          </td>
                          <td className="p-2.5">
                            {isReadOnly ? (
                              <span>{reading.turningPointDeltaL ?? '-'}</span>
                            ) : (
                              <input
                                type="number"
                                step="any"
                                placeholder="0.5d"
                                value={reading.turningPointDeltaL ?? ''}
                                onChange={(e) =>
                                  handleReadingChange(sIdx, rIdx, 'turningPointDeltaL', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs"
                              />
                            )}
                          </td>
                          <td className="p-2.5 pr-4 text-right">
                            {!isReadOnly && series.readings.length > 1 && (
                              <button
                                onClick={() => handleRemoveReading(sIdx, rIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Remove Run"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                {!isReadOnly && (
                  <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex justify-between items-center text-xs">
                    <button
                      onClick={() => handleAddReading(sIdx)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <Plus size={13} /> Add Additional Run
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Proof Modal */}
      <CalculationModal
        isOpen={Boolean(selectedExplanation)}
        onClose={() => setSelectedExplanation(null)}
        explanation={selectedExplanation}
      />
    </div>
  );
};
