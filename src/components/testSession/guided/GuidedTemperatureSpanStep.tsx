import React, { useState } from 'react';
import { TestSession, TemperatureSpanObservation, EnvironmentalReading } from '../../../types/testSession';
import { calculateTemperatureSpan } from '../../../metrology/calculations/environmental';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Thermometer, SkipForward, Calculator } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: TemperatureSpanObservation, readings?: EnvironmentalReading[]) => void;
  onSkip?: () => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedTemperatureSpanStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onSkip,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existingSpan = session.temperatureSpanObservation;
  const existingReadings = session.environmentalReadings || [];

  const e = inst.verificationScaleInterval || 1;
  const maxCap = inst.maxCapacity;

  // Initial temperatures from existing readings or standard defaults
  const defaultT1 = existingReadings[0]?.temperatureC ?? existingSpan?.temperatures[0]?.tempC ?? 20.0;
  const defaultT2 = existingReadings[1]?.temperatureC ?? existingSpan?.temperatures[1]?.tempC ?? 25.0;

  const [temp1, setTemp1] = useState<number>(defaultT1);
  const [spanIndication1, setSpanIndication1] = useState<number>(
    existingSpan?.temperatures[0]?.spanIndication ?? maxCap
  );
  const [zeroError1, setZeroError1] = useState<number>(existingSpan?.temperatures[0]?.zeroErrorE0 ?? 0);

  const [temp2, setTemp2] = useState<number>(defaultT2);
  const [spanIndication2, setSpanIndication2] = useState<number>(
    existingSpan?.temperatures[1]?.spanIndication ?? maxCap
  );
  const [zeroError2, setZeroError2] = useState<number>(existingSpan?.temperatures[1]?.zeroErrorE0 ?? 0);

  // Span error = Indication - Load - ZeroError
  const spanError1 = spanIndication1 - maxCap - zeroError1;
  const spanError2 = spanIndication2 - maxCap - zeroError2;

  // Real-time evaluation
  const evaluation = calculateTemperatureSpan({
    temperatures: [
      {
        tempC: temp1,
        zeroErrorE0: zeroError1,
        spanLoad: maxCap,
        spanIndication: spanIndication1,
        spanErrorE: spanError1,
      },
      {
        tempC: temp2,
        zeroErrorE0: zeroError2,
        spanLoad: maxCap,
        spanIndication: spanIndication2,
        spanErrorE: spanError2,
      },
    ],
    verificationScaleIntervalE: e,
    unit: inst.unit,
    accuracyClass: inst.accuracyClass,
  });

  const isCompliant = evaluation.compliance === 'PASS';

  const handleFinish = () => {
    const spanObs: TemperatureSpanObservation = {
      temperatures: [
        {
          tempC: temp1,
          zeroErrorE0: zeroError1,
          spanLoad: maxCap,
          spanIndication: spanIndication1,
          spanErrorE: spanError1,
        },
        {
          tempC: temp2,
          zeroErrorE0: zeroError2,
          spanLoad: maxCap,
          spanIndication: spanIndication2,
          spanErrorE: spanError2,
        },
      ],
      temperatureDifferenceDeltaT: evaluation.temperatureDifferenceDeltaT,
      spanShiftPer5C: evaluation.spanShiftPer5C,
      maxPermissibleShiftPer5C: evaluation.maxPermissibleShiftPer5C,
      compliance: evaluation.compliance,
    };

    // Also populate environmental readings for test stages if empty
    const envReadings: EnvironmentalReading[] = existingReadings.length >= 2
      ? existingReadings
      : [
          {
            id: `env-${Date.now()}-start`,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            stage: 'START',
            temperatureC: temp1,
            relativeHumidityPercent: 48,
            atmosphericPressureHPa: 1013,
            technicianNotes: 'Temperature Span T1 baseline recorded',
          },
          {
            id: `env-${Date.now()}-end`,
            timestamp: new Date().toISOString(),
            stage: 'END',
            temperatureC: temp2,
            relativeHumidityPercent: 49,
            atmosphericPressureHPa: 1013,
            technicianNotes: 'Temperature Span T2 verification recorded',
          },
        ];

    onSave(spanObs, envReadings);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Clause 3.9.2.3 & A.5.3: Static Temperature Test
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Temperature Span Stability (≤ 1.0 e Shift per 5°C)
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
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Thermometer size={15} />
            <span>OIML Clause 3.9.2.3: Span Stability Requirement</span>
          </div>
          <p className="text-amber-900/90 leading-relaxed">
            Evaluates span error stability between two temperatures (e.g. Start of testing and End of testing, or thermal chamber extremes).
            The difference in span error per <strong>5°C</strong> temperature variation shall not exceed <strong>1.0 e ({e} {inst.unit})</strong>.
          </p>
        </div>

        {/* Temperature Comparison Points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Point 1: Baseline Temperature T1 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Stage 1: Temperature T₁
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Start / Baseline</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                disabled={isReadOnly}
                value={temp1}
                onChange={(e) => setTemp1(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Span Indication at Max ({maxCap} {inst.unit})
              </label>
              <input
                type="number"
                step="any"
                disabled={isReadOnly}
                value={spanIndication1}
                onChange={(e) => setSpanIndication1(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>Zero Error (E₀): {zeroError1.toFixed(3)} {inst.unit}</span>
              <span className="font-bold text-slate-700">Span Error: {spanError1.toFixed(3)} {inst.unit}</span>
            </div>
          </div>

          {/* Point 2: Elevated/Varied Temperature T2 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Stage 2: Temperature T₂
              </span>
              <span className="text-[10px] text-slate-500 font-medium">End / Chamber</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                disabled={isReadOnly}
                value={temp2}
                onChange={(e) => setTemp2(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Span Indication at Max ({maxCap} {inst.unit})
              </label>
              <input
                type="number"
                step="any"
                disabled={isReadOnly}
                value={spanIndication2}
                onChange={(e) => setSpanIndication2(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono bg-white"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
              <span>Zero Error (E₀): {zeroError2.toFixed(3)} {inst.unit}</span>
              <span className="font-bold text-slate-700">Span Error: {spanError2.toFixed(3)} {inst.unit}</span>
            </div>
          </div>
        </div>

        {/* Real-Time Calculation Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={14} className="text-indigo-600" />
              Span Drift per 5°C: (|ΔE| / ΔT) × 5
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                isCompliant
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {isCompliant ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {evaluation.compliance} (≤ 1.0 e / 5°C)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Temp Difference (ΔT)
              </span>
              <span className="text-base font-bold text-slate-900">
                {evaluation.temperatureDifferenceDeltaT.toFixed(1)} °C
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Drift per 5°C
              </span>
              <span className="text-base font-bold text-slate-900">
                {evaluation.spanShiftPer5C.toFixed(4)} {inst.unit}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200">
              <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">
                Max Allowed (1.0 e)
              </span>
              <span className="text-base font-bold text-indigo-700">
                {e} {inst.unit}
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
                <span>Save Span Stability & Continue</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
