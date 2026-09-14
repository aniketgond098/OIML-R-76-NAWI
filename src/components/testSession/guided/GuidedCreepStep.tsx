import React, { useState, useEffect, useRef } from 'react';
import { TestSession, CreepTestObservation } from '../../../types/testSession';
import { ComplianceStatus } from '../../../types/metrology';
import { Play, Pause, RotateCcw, CheckCircle2, XCircle, Timer, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (obs: CreepTestObservation) => void;
  onWhyClick: () => void;
  onBackToOverview: () => void;
}

export const GuidedCreepStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const inst = session.instrumentSnapshot;
  const existingObs = session.creepObservation;
  const e = inst.verificationScaleInterval;
  const maxLoad = inst.maxCapacity;

  // Configuration options for duration
  const [testDuration, setTestDuration] = useState<number>(existingObs?.testDurationSeconds || 60); // 60s for QC or 240s
  const [secondsRemaining, setSecondsRemaining] = useState<number>(existingObs?.testDurationSeconds || 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerFinished, setIsTimerFinished] = useState<boolean>(existingObs?.timerCompleted || false);

  // Load and Indication inputs
  const [nominalLoad, setNominalLoad] = useState<number>(existingObs?.nominalLoad || maxLoad);
  const [initialIndication, setInitialIndication] = useState<number>(existingObs?.initialIndication ?? maxLoad);
  const [finalIndication, setFinalIndication] = useState<number>(existingObs?.finalIndication ?? maxLoad);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer lifecycle
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && secondsRemaining === 0) {
      setIsTimerRunning(false);
      setIsTimerFinished(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining]);

  const handleStartTimer = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(testDuration);
      setIsTimerFinished(false);
    }
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setSecondsRemaining(testDuration);
    setIsTimerFinished(false);
  };

  // Calculations
  const drift = Math.abs(finalIndication - initialIndication);
  // OIML R 76 Clause 3.9.4.1: Creep error shall not exceed 0.5 e during testing
  const maxPermissibleDrift = Number((0.5 * e).toFixed(5));
  const percentageDrift = nominalLoad > 0 ? (drift / nominalLoad) * 100 : 0;
  const compliance: ComplianceStatus = drift <= maxPermissibleDrift ? 'PASS' : 'FAIL';

  // Format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const progressPercent = testDuration > 0 ? Math.min(100, Math.round(((testDuration - secondsRemaining) / testDuration) * 100)) : 0;

  const handleFinish = () => {
    const obs: CreepTestObservation = {
      nominalLoad,
      testDurationSeconds: testDuration,
      initialIndication,
      finalIndication,
      driftValue: Number(drift.toFixed(5)),
      maxPermissibleDrift,
      percentageDrift: Number(percentageDrift.toFixed(4)),
      timerCompleted: isTimerFinished,
      compliance,
    };
    onSave(obs);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
            Creep & Stability Test (Clause 3.9.4.1)
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Time-Based Creep Stability
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
        {/* WHAT TO DO Instruction box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">What To Do</h4>
          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Place reference load (<strong className="text-slate-900">{nominalLoad} {inst.unit}</strong>) gently on the platform.</li>
            <li>Record initial indication <strong className="text-slate-900 font-mono">I₀</strong> as soon as stable.</li>
            <li>Press <strong className="text-indigo-600">Start Timer</strong> and leave load undisturbed for duration.</li>
            <li>When timer finishes, record final indication <strong className="text-slate-900 font-mono">Iₜ</strong>.</li>
            <li>Press <strong className="text-slate-900">Save & Continue</strong> to record result.</li>
          </ol>
        </div>

        {/* Test Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Applied Load ({inst.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={nominalLoad}
                disabled={isReadOnly}
                onChange={(e) => setNominalLoad(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                {inst.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Test Duration (Protocol)
            </label>
            <div className="flex gap-2">
              {[
                { label: '60s QC', secs: 60 },
                { label: '4 Min (240s)', secs: 240 },
                { label: '30 Min (1800s)', secs: 1800 },
              ].map((opt) => (
                <button
                  key={opt.secs}
                  type="button"
                  disabled={isTimerRunning || isReadOnly}
                  onClick={() => {
                    setTestDuration(opt.secs);
                    setSecondsRemaining(opt.secs);
                    setIsTimerFinished(false);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-colors ${
                    testDuration === opt.secs
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Timer Card */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`h-5 w-5 ${isTimerRunning ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {isTimerRunning ? 'Test in progress...' : isTimerFinished ? 'Duration Complete' : 'Ready to Start'}
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {progressPercent}% Elapsed
            </span>
          </div>

          {/* Time Display */}
          <div className="text-center py-2">
            <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-tight text-white">
              {formatTime(secondsRemaining)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isTimerRunning
                ? 'Keep platform completely undisturbed'
                : isTimerFinished
                ? 'Time requirement satisfied. Enter final indication below.'
                : 'Press Start when load is placed'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isTimerFinished ? 'bg-emerald-400' : 'bg-indigo-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Controls */}
          {!isReadOnly && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {!isTimerRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Play size={14} />
                  <span>{secondsRemaining < testDuration ? 'Resume Timer' : 'Start Test Timer'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePauseTimer}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Pause size={14} />
                  <span>Pause</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetTimer}
                disabled={isTimerRunning}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1 disabled:opacity-40"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* Indications Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Indication I₀ (t = 0)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={initialIndication}
                disabled={isReadOnly}
                onChange={(e) => setInitialIndication(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                {inst.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Final Indication Iₜ (after duration)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={finalIndication}
                disabled={isReadOnly}
                onChange={(e) => setFinalIndication(parseFloat(e.target.value) || 0)}
                className="w-full text-base font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-slate-100"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                {inst.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Results calculation */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Drift Magnitude (ΔI = |Iₜ - I₀|):</span>
            <div className="font-mono font-bold text-slate-900 text-sm">
              {drift.toFixed(4)} {inst.unit}
              <span className="text-xs text-slate-500 font-normal ml-2">
                ({percentageDrift.toFixed(3)}% of load)
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-slate-500 font-medium">Permissible Drift Limit (0.5 e):</span>
            <div className="font-mono text-slate-700">
              ±{maxPermissibleDrift.toFixed(4)} {inst.unit} (0.5e)
            </div>
          </div>
          <div className="self-start sm:self-center">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                compliance === 'PASS'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {compliance === 'PASS' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              {compliance}
            </span>
          </div>
        </div>

        {/* Safeguard message if attempting to save before timer finishes */}
        {!isTimerFinished && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Required Test Condition:</strong> The verified test procedure requires keeping load applied for the full {testDuration} seconds. You may finish once the timer reaches 00:00.
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToOverview}
          className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
        >
          Back to Plan
        </button>

        {!isReadOnly && (
          <button
            type="button"
            disabled={!isTimerFinished}
            onClick={handleFinish}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <span>Save & Continue</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
