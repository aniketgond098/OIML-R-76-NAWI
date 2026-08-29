import React, { useState, useEffect } from 'react';
import { TestSession, ZeroSettingObservation, TareObservation } from '../../../types/testSession';
import { calculateZeroSetting } from '../../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../../metrology/calculations/tare';
import { CalculationModal } from '../../common/CalculationModal';
import { CalculationExplanation } from '../../../types/metrology';
import { ComplianceBadge } from '../../common/ComplianceBadge';
import { Calculator, Sliders } from 'lucide-react';

interface Props {
  session: TestSession;
  isReadOnly: boolean;
  onUpdateZeroSetting: (obs: ZeroSettingObservation) => void;
  onUpdateTare: (obs: TareObservation) => void;
  onUpdateBoth?: (zeroObs: ZeroSettingObservation, tareObs: TareObservation) => void;
}

export const ZeroTareTestTab: React.FC<Props> = ({
  session,
  isReadOnly,
  onUpdateZeroSetting,
  onUpdateTare,
  onUpdateBoth,
}) => {
  const inst = session.instrumentSnapshot;
  const [selectedExplanation, setSelectedExplanation] = useState<CalculationExplanation | null>(null);

  // Current states or defaults
  const zeroObs: ZeroSettingObservation = session.zeroSettingObservation || {
    testType: 'NON_AUTOMATIC_ZERO_SETTING',
    zeroLoad: 0,
    zeroIndication: 0,
    turningPointDeltaL0: 0.5 * inst.actualScaleInterval,
    calculatedZeroErrorE0: 0,
    maxPermissibleZeroError: 0.25 * inst.verificationScaleInterval,
    compliance: 'PASS',
  };

  const tareObs: TareObservation = session.tareObservation || {
    tareLoadApplied: Number((inst.maxCapacity * 0.3).toFixed(3)),
    indicatedTare: Number((inst.maxCapacity * 0.3).toFixed(3)),
    turningPointDeltaLTare: 0.5 * inst.actualScaleInterval,
    calculatedTareError: 0,
    netTestPoints: [
      {
        nominalNetLoad: Number((inst.maxCapacity * 0.4).toFixed(3)),
        indicatedNet: Number((inst.maxCapacity * 0.4).toFixed(3)),
        turningPointDeltaL: 0.5 * inst.actualScaleInterval,
        correctedNetErrorEc: 0,
        mpeInUnit: inst.verificationScaleInterval,
        compliance: 'PASS',
      },
    ],
    compliance: 'PASS',
  };

  // Sync to parent if session does not have both initialized
  useEffect(() => {
    if (isReadOnly) return;
    if (!session.zeroSettingObservation || !session.tareObservation) {
      if (onUpdateBoth) {
        onUpdateBoth(zeroObs, tareObs);
      } else {
        if (!session.zeroSettingObservation) onUpdateZeroSetting(zeroObs);
        if (!session.tareObservation) onUpdateTare(tareObs);
      }
    }
  }, []);

  const handleZeroFieldChange = (
    field: 'zeroIndication' | 'turningPointDeltaL0' | 'testType',
    value: any
  ) => {
    const updated = { ...zeroObs, [field]: value };
    const evalRes = calculateZeroSetting({
      zeroIndicationI0: Number(updated.zeroIndication),
      turningPointDeltaL0: Number(updated.turningPointDeltaL0),
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      maxCapacity: inst.maxCapacity,
    });

    updated.calculatedZeroErrorE0 = evalRes.calculatedZeroErrorE0;
    updated.maxPermissibleZeroError = evalRes.maxPermissibleZeroError;
    updated.compliance = evalRes.compliance;

    onUpdateZeroSetting(updated);
  };

  const handleTareFieldChange = (
    field: 'tareLoadApplied' | 'indicatedTare' | 'turningPointDeltaLTare',
    value: number
  ) => {
    const updated = { ...tareObs, [field]: value };
    const evalRes = calculateTare({
      tareLoadAppliedT: Number(updated.tareLoadApplied),
      indicatedTareI: Number(updated.indicatedTare),
      turningPointDeltaLTare: Number(updated.turningPointDeltaLTare),
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      netTestPoints: updated.netTestPoints.map((pt) => ({
        nominalNetLoad: pt.nominalNetLoad,
        indicatedNet: pt.indicatedNet,
        turningPointDeltaL: pt.turningPointDeltaL,
      })),
    });

    updated.calculatedTareError = evalRes.calculatedTareErrorEtare;
    updated.netTestPoints = evalRes.evaluatedNetPoints;
    updated.compliance = evalRes.compliance;

    onUpdateTare(updated);
  };

  const handleNetPointChange = (
    index: number,
    field: 'nominalNetLoad' | 'indicatedNet' | 'turningPointDeltaL',
    value: number
  ) => {
    const updatedPoints = [...tareObs.netTestPoints];
    updatedPoints[index] = { ...updatedPoints[index], [field]: value };

    const updated = { ...tareObs, netTestPoints: updatedPoints };
    const evalRes = calculateTare({
      tareLoadAppliedT: Number(updated.tareLoadApplied),
      indicatedTareI: Number(updated.indicatedTare),
      turningPointDeltaLTare: Number(updated.turningPointDeltaLTare),
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      netTestPoints: updated.netTestPoints.map((pt) => ({
        nominalNetLoad: pt.nominalNetLoad,
        indicatedNet: pt.indicatedNet,
        turningPointDeltaL: pt.turningPointDeltaL,
      })),
    });

    updated.calculatedTareError = evalRes.calculatedTareErrorEtare;
    updated.netTestPoints = evalRes.evaluatedNetPoints;
    updated.compliance = evalRes.compliance;

    onUpdateTare(updated);
  };

  const zeroExplanation = calculateZeroSetting({
    zeroIndicationI0: zeroObs.zeroIndication,
    turningPointDeltaL0: zeroObs.turningPointDeltaL0,
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
    maxCapacity: inst.maxCapacity,
  }).explanation;

  const tareExplanation = calculateTare({
    tareLoadAppliedT: tareObs.tareLoadApplied,
    indicatedTareI: tareObs.indicatedTare,
    turningPointDeltaLTare: tareObs.turningPointDeltaLTare,
    verificationScaleIntervalE: inst.verificationScaleInterval,
    unit: inst.unit,
    accuracyClass: inst.accuracyClass,
    netTestPoints: tareObs.netTestPoints,
  }).explanation;

  return (
    <div id="zero-tare-test-tab" className="space-y-6 sm:space-y-8">
      {/* 1. ZERO SETTING & ZERO TRACKING TEST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <Sliders size={18} className="text-indigo-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Clause 4.5.2 & A.4.2: Zero-Setting & Zero-Tracking Accuracy (|E0| ≤ 0.25e)
              </h4>
              <p className="text-xs text-slate-500">
                The zero-setting device shall bring the indication to zero within ± 0.25e.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <ComplianceBadge status={zeroObs.compliance} />
            <button
              onClick={() => setSelectedExplanation(zeroExplanation)}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <Calculator size={14} /> View Proof
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Zero Device Type
            </label>
            {isReadOnly ? (
              <span className="text-xs font-semibold text-slate-800">{zeroObs.testType}</span>
            ) : (
              <select
                value={zeroObs.testType}
                onChange={(e) => handleZeroFieldChange('testType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              >
                <option value="NON_AUTOMATIC_ZERO_SETTING">Non-Automatic Zero</option>
                <option value="SEMI_AUTOMATIC_ZERO_SETTING">Semi-Automatic Zero</option>
                <option value="INITIAL_ZERO_SETTING">Initial Zero Setting</option>
                <option value="ZERO_TRACKING">Zero Tracking</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Indication at Zero (I0)
            </label>
            {isReadOnly ? (
              <span className="text-xs font-mono text-slate-800">{zeroObs.zeroIndication} {inst.unit}</span>
            ) : (
              <input
                type="number"
                step="any"
                value={zeroObs.zeroIndication}
                onChange={(e) => handleZeroFieldChange('zeroIndication', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Flash Weight (ΔL0)
            </label>
            {isReadOnly ? (
              <span className="text-xs font-mono text-slate-800">{zeroObs.turningPointDeltaL0} {inst.unit}</span>
            ) : (
              <input
                type="number"
                step="any"
                value={zeroObs.turningPointDeltaL0}
                onChange={(e) => handleZeroFieldChange('turningPointDeltaL0', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Calculated Zero Error (E0)</span>
            <div className="text-sm font-bold font-mono text-slate-900 mt-1">
              {zeroObs.calculatedZeroErrorE0.toFixed(4)} {inst.unit}
            </div>
            <span className="text-[10px] text-slate-500">
              Tolerance: ±{(0.25 * inst.verificationScaleInterval).toFixed(4)} {inst.unit} (0.25e)
            </span>
          </div>
        </div>
      </div>

      {/* 2. TARE DEVICE ACCURACY & NET WEIGHING TEST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Clause 4.6 & A.4.6: Tare Setting Accuracy (|Etare| ≤ 0.25e) & Net Weighing
            </h4>
            <p className="text-xs text-slate-500">
              Accuracy of tare setting shall be evaluated within ± 0.25e, and subsequent net load errors within MPE.
            </p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <ComplianceBadge status={tareObs.compliance} />
            <button
              onClick={() => setSelectedExplanation(tareExplanation)}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              <Calculator size={14} /> View Proof
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Tare Load Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tare Load Applied (T)
              </label>
              {isReadOnly ? (
                <span className="text-xs font-mono text-slate-800">{tareObs.tareLoadApplied} {inst.unit}</span>
              ) : (
                <input
                  type="number"
                  step="any"
                  value={tareObs.tareLoadApplied}
                  onChange={(e) => handleTareFieldChange('tareLoadApplied', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Indicated Tare (Itare)
              </label>
              {isReadOnly ? (
                <span className="text-xs font-mono text-slate-800">{tareObs.indicatedTare} {inst.unit}</span>
              ) : (
                <input
                  type="number"
                  step="any"
                  value={tareObs.indicatedTare}
                  onChange={(e) => handleTareFieldChange('indicatedTare', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Flash Weight (ΔLtare)
              </label>
              {isReadOnly ? (
                <span className="text-xs font-mono text-slate-800">{tareObs.turningPointDeltaLTare} {inst.unit}</span>
              ) : (
                <input
                  type="number"
                  step="any"
                  value={tareObs.turningPointDeltaLTare}
                  onChange={(e) => handleTareFieldChange('turningPointDeltaLTare', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Calculated Tare Error (Etare)</span>
              <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                {tareObs.calculatedTareError.toFixed(4)} {inst.unit}
              </div>
              <span className="text-[10px] text-slate-500">
                Tolerance: ±{(0.25 * inst.verificationScaleInterval).toFixed(4)} {inst.unit}
              </span>
            </div>
          </div>

          {/* Net Load Points */}
          <div>
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Net Load Verification Points
            </h5>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[620px]">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                    <th className="p-2.5">Net Load</th>
                    <th className="p-2.5">Indicated Net</th>
                    <th className="p-2.5">ΔL</th>
                    <th className="p-2.5">Corrected Error (Ec)</th>
                    <th className="p-2.5">MPE Limit</th>
                    <th className="p-2.5 pr-4 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {tareObs.netTestPoints.map((pt, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        {isReadOnly ? (
                          <span>{pt.nominalNetLoad} {inst.unit}</span>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            value={pt.nominalNetLoad}
                            onChange={(e) => handleNetPointChange(idx, 'nominalNetLoad', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        )}
                      </td>
                      <td className="p-2.5">
                        {isReadOnly ? (
                          <span>{pt.indicatedNet} {inst.unit}</span>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            value={pt.indicatedNet}
                            onChange={(e) => handleNetPointChange(idx, 'indicatedNet', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        )}
                      </td>
                      <td className="p-2.5">
                        {isReadOnly ? (
                          <span>{pt.turningPointDeltaL ?? '-'}</span>
                        ) : (
                          <input
                            type="number"
                            step="any"
                            value={pt.turningPointDeltaL ?? ''}
                            onChange={(e) => handleNetPointChange(idx, 'turningPointDeltaL', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                        )}
                      </td>
                      <td className="p-2.5 font-bold">
                        {pt.correctedNetErrorEc !== undefined ? `${pt.correctedNetErrorEc.toFixed(4)} ${inst.unit}` : '-'}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {pt.mpeInUnit !== undefined ? `±${pt.mpeInUnit.toFixed(4)} ${inst.unit}` : '-'}
                      </td>
                      <td className="p-2.5 pr-4 text-right">
                        <ComplianceBadge status={pt.compliance} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
