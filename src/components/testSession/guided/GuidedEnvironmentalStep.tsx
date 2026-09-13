import React, { useState } from 'react';
import { TestSession, EnvironmentalReading } from '../../../types/testSession';
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft, HelpCircle, Check, Thermometer } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (readings: EnvironmentalReading[]) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedEnvironmentalStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const existingReading = session.environmentalReadings?.[0];

  const [temperature, setTemperature] = useState<number>(existingReading?.temperatureC ?? 21.0);
  const [humidity, setHumidity] = useState<number>(existingReading?.relativeHumidityPercent ?? 48);
  const [pressure, setPressure] = useState<number>(existingReading?.atmosphericPressureHPa ?? 1013);
  const [warmUpMinutes, setWarmUpMinutes] = useState<number>(30);
  const [isStable, setIsStable] = useState<boolean>(true);

  // Check temperature limits (standard OIML range: -10°C to +40°C or +10°C to +30°C for Class II/III)
  const isTempValid = temperature >= 10 && temperature <= 40;
  const isHumidityValid = humidity >= 20 && humidity <= 85;
  const isCompliant = isTempValid && isHumidityValid && isStable;

  const handleFinish = () => {
    const reading: EnvironmentalReading = {
      id: `env-${Date.now()}`,
      timestamp: new Date().toISOString(),
      stage: 'START',
      temperatureC: temperature,
      relativeHumidityPercent: humidity,
      atmosphericPressureHPa: pressure,
      technicianNotes: isStable
        ? `Lab conditions verified compliant (warm-up ${warmUpMinutes} min).`
        : `Unstable conditions flagged (warm-up ${warmUpMinutes} min).`,
    };
    onSave([reading]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Environmental & Temperature Span (Clause 3.9)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Record Laboratory Ambient Conditions
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
        <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
          <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block mb-1">
            Instructions
          </span>
          <p className="text-xs text-slate-700">
            Verify and record the test room environmental conditions. Instruments must operate within prescribed temperature and humidity limits during metrological verification.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Ambient Temperature (°C)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">°C</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Permissible: +10°C to +40°C</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Relative Humidity (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={humidity}
                onChange={(e) => setHumidity(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">%</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Permissible: 20% to 85%</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Atmospheric Pressure (hPa)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={pressure}
                onChange={(e) => setPressure(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">hPa</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Standard: ~1013 hPa</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Warm-up Duration (minutes)
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={warmUpMinutes}
                onChange={(e) => setWarmUpMinutes(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">min</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Typically ≥ 30 min</span>
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={isStable}
            onChange={(e) => setIsStable(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span className="text-xs text-slate-700 font-medium">
            Room conditions are free from severe drafts, thermal shock, or direct sunlight
          </span>
        </label>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          onClick={onBackToOverview}
          className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
        >
          Test Plan Overview
        </button>

        <button
          onClick={handleFinish}
          disabled={isReadOnly}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Check size={14} /> Save Environmental Conditions & Continue
        </button>
      </div>
    </div>
  );
};
