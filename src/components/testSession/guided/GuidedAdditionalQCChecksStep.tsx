import React, { useState } from 'react';
import { TestSession, AdditionalQCChecks } from '../../../types/testSession';
import { CheckCircle2, XCircle, ArrowRight, ShieldAlert, Cpu, Wrench, FileCheck, HelpCircle } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onSave: (qc: AdditionalQCChecks) => void;
  onWhyClick?: () => void;
  onBackToOverview: () => void;
}

export const GuidedAdditionalQCChecksStep: React.FC<Props> = ({
  session,
  isReadOnly,
  onSave,
  onWhyClick,
  onBackToOverview,
}) => {
  const existingQC = session.additionalQCChecks;

  // Mechanical / Physical inspection
  const [levelingBubble, setLevelingBubble] = useState<boolean>(existingQC?.levelingBubbleCentered ?? true);
  const [platterStability, setPlatterStability] = useState<boolean>(existingQC?.platterStabilitySecure ?? true);
  const [sealingMarks, setSealingMarks] = useState<boolean>(existingQC?.sealingMarksIntact ?? true);
  const [housingDamage, setHousingDamage] = useState<boolean>(existingQC?.housingDamageNone ?? true);
  const [feetLockingNut, setFeetLockingNut] = useState<boolean>(existingQC?.feetLockingNutTight ?? true);
  const [cleanliness, setCleanliness] = useState<boolean>(existingQC?.cleanlinessAcceptable ?? true);

  // Electrical & Sensor Checks
  const [rawAdcZero, setRawAdcZero] = useState<number>(existingQC?.rawAdcZeroCount ?? 125400);
  const [rawAdcSpan, setRawAdcSpan] = useState<number>(existingQC?.rawAdcSpanCount ?? 1125400);
  const [excitationVoltage, setExcitationVoltage] = useState<number>(existingQC?.excitationVoltageV ?? 5.0);
  const [displaySegments, setDisplaySegments] = useState<boolean>(existingQC?.displaySegmentsOk ?? true);
  const [keypadResponse, setKeypadResponse] = useState<boolean>(existingQC?.keypadResponseOk ?? true);
  const [pcbFirmware, setPcbFirmware] = useState<string>(existingQC?.pcbFirmwareVersion ?? 'v2.4.1-REL');
  const [loadcellSerial, setLoadcellSerial] = useState<string>(existingQC?.loadcellSerialNumber ?? `LC-${session.instrumentSnapshot.serialNumber.slice(-5)}`);

  // Sign-off notes
  const [qcNotes, setQcNotes] = useState<string>(existingQC?.qcNotes ?? 'All mechanical stops, overload protection, and ADC counts within laboratory manufacturer tolerances.');
  const [inspectorName, setInspectorName] = useState<string>(existingQC?.qcInspectorName ?? session.technicianName);

  // Calculated count difference
  const countSpan = rawAdcSpan - rawAdcZero;
  const mechanicalAllPass = levelingBubble && platterStability && sealingMarks && housingDamage && feetLockingNut && cleanliness;
  const electricalAllPass = displaySegments && keypadResponse && countSpan > 50000 && excitationVoltage >= 4.5 && excitationVoltage <= 5.5;
  const overallQcStatus = mechanicalAllPass && electricalAllPass ? 'PASS' : 'FAIL';

  const handleFinish = () => {
    const qc: AdditionalQCChecks = {
      levelingBubbleCentered: levelingBubble,
      platterStabilitySecure: platterStability,
      sealingMarksIntact: sealingMarks,
      housingDamageNone: housingDamage,
      feetLockingNutTight: feetLockingNut,
      cleanlinessAcceptable: cleanliness,
      rawAdcZeroCount: rawAdcZero,
      rawAdcSpanCount: rawAdcSpan,
      excitationVoltageV: excitationVoltage,
      displaySegmentsOk: displaySegments,
      keypadResponseOk: keypadResponse,
      pcbFirmwareVersion: pcbFirmware,
      loadcellSerialNumber: loadcellSerial,
      qcInspectorName: inspectorName,
      qcNotes: qcNotes,
      inspectionDate: new Date().toISOString(),
      overallQcStatus,
    };
    onSave(qc);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden max-w-3xl mx-auto">
      {/* Sub-Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Laboratory / Manufacturer QC
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Non-OIML Supplementary Check</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-1">
            Visual, Mechanical & Electronics QC Inspection
          </h3>
        </div>
        {onWhyClick && (
          <button
            type="button"
            onClick={onWhyClick}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            <HelpCircle size={14} /> Why this check?
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Distinction Banner */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
          <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Laboratory / Manufacturer QC Notice:</strong> These checks are based on reference quality assurance procedures and factory acceptance worksheets. They provide supplementary verification of hardware integrity and are clearly distinguished from legal metrology OIML R 76 requirements.
          </div>
        </div>

        {/* Section 1: Mechanical & Visual Integrity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
            <Wrench size={14} className="text-slate-600" />
            <span>1. Mechanical & Visual Physical Checks</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Leveling bubble centered & intact', val: levelingBubble, set: setLevelingBubble },
              { label: 'Platter & sub-frame seating secure', val: platterStability, set: setPlatterStability },
              { label: 'Manufacturer sealing / tamper mark intact', val: sealingMarks, set: setSealingMarks },
              { label: 'Housing free of deformation & cracks', val: housingDamage, set: setHousingDamage },
              { label: 'Adjustable leveling feet locked tight', val: feetLockingNut, set: setFeetLockingNut },
              { label: 'Cleanliness of load receptor & chassis', val: cleanliness, set: setCleanliness },
            ].map((chk, i) => (
              <label
                key={i}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  chk.val
                    ? 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                    : 'bg-rose-50/40 border-rose-200 text-slate-800'
                }`}
              >
                <span className="text-xs font-medium">{chk.label}</span>
                <input
                  type="checkbox"
                  checked={chk.val}
                  disabled={isReadOnly}
                  onChange={(e) => chk.set(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Section 2: Sensor & Electronic Signals */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
            <Cpu size={14} className="text-slate-600" />
            <span>2. Electronics, ADC & Sensor Telemetry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Zero ADC Counts (Raw)
              </label>
              <input
                type="number"
                value={rawAdcZero}
                disabled={isReadOnly}
                onChange={(e) => setRawAdcZero(parseInt(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Span ADC Counts
              </label>
              <input
                type="number"
                value={rawAdcSpan}
                disabled={isReadOnly}
                onChange={(e) => setRawAdcSpan(parseInt(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Excitation Voltage (V)
              </label>
              <input
                type="number"
                step="0.1"
                value={excitationVoltage}
                disabled={isReadOnly}
                onChange={(e) => setExcitationVoltage(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Effective Span Counts (ΔADC):</span>{' '}
              <strong className="font-mono text-slate-900 font-bold">{countSpan.toLocaleString()} counts</strong>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={displaySegments}
                  disabled={isReadOnly}
                  onChange={(e) => setDisplaySegments(e.target.checked)}
                  className="rounded text-indigo-600 h-3.5 w-3.5"
                />
                <span className="text-slate-700">Display Segments Test</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keypadResponse}
                  disabled={isReadOnly}
                  onChange={(e) => setKeypadResponse(e.target.checked)}
                  className="rounded text-indigo-600 h-3.5 w-3.5"
                />
                <span className="text-slate-700">Keypad Tactile Response</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mainboard PCB / Firmware Version
              </label>
              <input
                type="text"
                value={pcbFirmware}
                disabled={isReadOnly}
                onChange={(e) => setPcbFirmware(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Load Cell Part / Serial Number
              </label>
              <input
                type="text"
                value={loadcellSerial}
                disabled={isReadOnly}
                onChange={(e) => setLoadcellSerial(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: QC Inspector Notes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-1 border-b border-slate-100">
            <FileCheck size={14} className="text-slate-600" />
            <span>3. QC Inspector Remarks & Sign-off</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Quality Assurance Notes
              </label>
              <textarea
                rows={2}
                value={qcNotes}
                disabled={isReadOnly}
                onChange={(e) => setQcNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Inspector Name
              </label>
              <input
                type="text"
                value={inspectorName}
                disabled={isReadOnly}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500 block">Overall Supplementary QC Evaluation:</span>
            <span className="font-bold text-slate-800">
              {overallQcStatus === 'PASS' ? 'All manufacturer acceptance criteria met' : 'One or more QC checks flagged'}
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase flex items-center gap-1 ${
              overallQcStatus === 'PASS'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {overallQcStatus === 'PASS' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            {overallQcStatus}
          </span>
        </div>
      </div>

      {/* Footer */}
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
            onClick={handleFinish}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>Save & Continue</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
