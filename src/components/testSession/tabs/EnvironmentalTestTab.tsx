import React from 'react';
import { TestSession, EnvironmentalReading } from '../../../types/testSession';
import { calculateTemperatureSpan } from '../../../metrology/calculations/environmental';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { Thermometer, Droplets, Gauge, Plus } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateEnvironmentalReadings: (readings: EnvironmentalReading[]) => void;
}

export const EnvironmentalTestTab: React.FC<Props> = ({
  session,
  isReadOnly,
  onUpdateEnvironmentalReadings,
}) => {
  const inst = session.instrumentSnapshot;
  const readings = session.environmentalReadings || [];

  const handleAddReading = () => {
    const newReading: EnvironmentalReading = {
      id: `env-${Date.now()}`,
      timestamp: new Date().toISOString(),
      stage: 'INTERMEDIATE',
      temperatureC: 22.0,
      relativeHumidityPercent: 50,
      atmosphericPressureHPa: 1013.2,
    };
    onUpdateEnvironmentalReadings([...readings, newReading]);
  };

  const handleFieldChange = (
    index: number,
    field: 'temperatureC' | 'relativeHumidityPercent' | 'atmosphericPressureHPa' | 'stage',
    value: any
  ) => {
    const updated = [...readings];
    updated[index] = { ...updated[index], [field]: value };
    onUpdateEnvironmentalReadings(updated);
  };

  // Temperature span check
  const startReading = readings.find((r) => r.stage === 'START') || readings[0];
  const endReading = readings.find((r) => r.stage === 'END') || readings[readings.length - 1];

  const tempSpanEval =
    startReading && endReading && startReading !== endReading
      ? calculateTemperatureSpan({
          temperatures: [
            {
              tempC: startReading.temperatureC,
              zeroErrorE0: 0,
              spanLoad: inst.maxCapacity,
              spanIndication: inst.maxCapacity,
              spanErrorE: 0,
            },
            {
              tempC: endReading.temperatureC,
              zeroErrorE0: 0,
              spanLoad: inst.maxCapacity,
              spanIndication: inst.maxCapacity,
              spanErrorE: 0,
            },
          ],
          verificationScaleIntervalE: inst.verificationScaleInterval,
          unit: inst.unit,
          accuracyClass: inst.accuracyClass,
        })
      : null;

  return (
    <div id="environmental-test-tab" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Clause 3.9.2 & A.5.3: Environmental Conditions & Temperature Span Drift
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Record ambient temperature, humidity, and barometric pressure throughout testing stages.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleAddReading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors"
          >
            <Plus size={14} /> Add Reading Stage
          </button>
        )}
      </div>

      {/* Environmental Readings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                <th className="p-3 pl-4">Stage</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Temperature (°C)</th>
                <th className="p-3">Rel. Humidity (%)</th>
                <th className="p-3">Pressure (hPa)</th>
                <th className="p-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {readings.map((r, idx) => (
                <tr key={r.id || idx} className="hover:bg-slate-50">
                  <td className="p-3 pl-4 font-sans font-bold text-slate-800">
                    {isReadOnly ? (
                      <span>{r.stage}</span>
                    ) : (
                      <select
                        value={r.stage}
                        onChange={(e) => handleFieldChange(idx, 'stage', e.target.value)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold"
                      >
                        <option value="START">Start of Test</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="END">End of Test</option>
                      </select>
                    )}
                  </td>
                  <td className="p-3 text-slate-500 font-sans">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3 font-bold text-slate-800">
                    {isReadOnly ? (
                      `${r.temperatureC} °C`
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        value={r.temperatureC}
                        onChange={(e) => handleFieldChange(idx, 'temperatureC', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {isReadOnly ? (
                      `${r.relativeHumidityPercent} %`
                    ) : (
                      <input
                        type="number"
                        step="1"
                        value={r.relativeHumidityPercent}
                        onChange={(e) => handleFieldChange(idx, 'relativeHumidityPercent', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {isReadOnly ? (
                      `${r.atmosphericPressureHPa ?? '-'} hPa`
                    ) : (
                      <input
                        type="number"
                        step="0.1"
                        value={r.atmosphericPressureHPa ?? ''}
                        onChange={(e) => handleFieldChange(idx, 'atmosphericPressureHPa', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                      />
                    )}
                  </td>
                  <td className="p-3 pr-4 font-sans">
                    {r.temperatureC >= 10 && r.temperatureC <= 30 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                        Normal Range (10-30°C)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-xs">
                        Outside Standard Range
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Temperature Span Summary */}
      {tempSpanEval && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Temperature Span Stability Evaluation
            </h5>
            <p className="text-xs text-slate-600 mt-1">
              Temperature Difference ($\Delta T$): {tempSpanEval.temperatureDifferenceDeltaT.toFixed(1)}°C | Shift per 5°C: {tempSpanEval.spanShiftPer5C.toFixed(4)} {inst.unit}
            </p>
          </div>
          <ComplianceBadge status={tempSpanEval.compliance} />
        </div>
      )}
    </div>
  );
};
