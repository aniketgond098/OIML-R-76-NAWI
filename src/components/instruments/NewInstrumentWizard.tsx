import React, { useState } from 'react';
import { AccuracyClass, MassUnit } from '../../types/metrology';
import { Instrument, InstrumentType, LoadReceptorType } from '../../types/instrument';
import { db } from '../../services/storage/database';
import { useAuth } from '../../services/auth/authContext';
import { CheckCircle2, ChevronRight, ChevronLeft, Scale, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { Decimal } from '../../metrology/units/decimal';

interface Props {
  onCancel: () => void;
  onSaved: (instrument: Instrument) => void;
}

export const NewInstrumentWizard: React.FC<Props> = ({ onCancel, onSaved }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState<Partial<Instrument>>({
    instrumentIdTag: `NAWI-${Math.floor(100 + Math.random() * 900)}`,
    manufacturer: '',
    model: '',
    serialNumber: '',
    instrumentType: 'Electronic Balance',
    accuracyClass: 'CLASS_III',
    maxCapacity: 15,
    minCapacity: 0.1,
    verificationScaleInterval: 0.005, // e
    actualScaleInterval: 0.005, // d
    unit: 'kg',
    numberOfIntervals: 3000,
    tareType: 'Subtractive',
    maxTare: 15,
    additiveTare: 0,
    loadReceptorType: 'Rectangular Platform',
    numberOfSupportPoints: 4,
    platformDimensions: '300 x 400 mm',
    softwareVersion: 'v1.0.0',
    powerSupply: '230V AC 50Hz',
    operatingTemperatureMin: -10,
    operatingTemperatureMax: 40,
    patternApprovalNumber: '',
    markingDetails: '',
    laboratoryId: 'LAB-IND-001',
    components: [],
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Update calculated n = Max / e
  const handleCapacityOrIntervalChange = (max: number, e: number) => {
    if (max > 0 && e > 0) {
      const dMax = new Decimal(max);
      const de = new Decimal(e);
      const n = dMax.dividedBy(de).toNumber();
      setFormData((prev) => ({
        ...prev,
        maxCapacity: max,
        verificationScaleInterval: e,
        numberOfIntervals: n,
      }));
    }
  };

  // Table 3 OIML R-76 validation
  const validateTable3ClassRules = (): { valid: boolean; message?: string } => {
    const { accuracyClass, verificationScaleInterval: e, numberOfIntervals: n, unit } = formData;
    if (!e || !n) return { valid: false, message: 'Invalid capacity or interval' };

    // Convert e to grams for table 3 check
    let eInGrams = e;
    if (unit === 'kg') eInGrams = e * 1000;
    if (unit === 'mg') eInGrams = e / 1000;
    if (unit === 't') eInGrams = e * 1000000;

    switch (accuracyClass) {
      case 'CLASS_I':
        if (eInGrams < 0.001) return { valid: false, message: 'Class I: verification interval e must be >= 0.001 g.' };
        if (n < 50000) return { valid: false, message: 'Class I: minimum number of verification intervals (n) is 50,000.' };
        break;

      case 'CLASS_II':
        if (eInGrams < 0.001) return { valid: false, message: 'Class II: e must be >= 0.001 g.' };
        if (eInGrams <= 0.05 && (n < 100 || n > 100000)) {
          return { valid: false, message: 'Class II (0.001g <= e <= 0.05g): n must be between 100 and 100,000.' };
        }
        if (eInGrams >= 0.1 && (n < 5000 || n > 100000)) {
          return { valid: false, message: 'Class II (e >= 0.1g): n must be between 5,000 and 100,000.' };
        }
        break;

      case 'CLASS_III':
        if (eInGrams < 0.1) return { valid: false, message: 'Class III: e must be >= 0.1 g.' };
        if (n < 100 || n > 10000) return { valid: false, message: 'Class III: n must be between 100 and 10,000.' };
        break;

      case 'CLASS_IIII':
        if (eInGrams < 5.0) return { valid: false, message: 'Class IIII: e must be >= 5 g.' };
        if (n < 100 || n > 1000) return { valid: false, message: 'Class IIII: n must be between 100 and 1,000.' };
        break;
    }

    return { valid: true };
  };

  const handleNext = () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!formData.manufacturer?.trim() || !formData.model?.trim() || !formData.serialNumber?.trim()) {
        setValidationError('Please enter Manufacturer, Model name, and unique Serial Number.');
        return;
      }
    }

    if (currentStep === 2) {
      const check = validateTable3ClassRules();
      if (!check.valid) {
        setValidationError(`OIML R 76-1:2006 Table 3 Mismatch: ${check.message}`);
        return;
      }
      if ((formData.minCapacity || 0) <= 0 || (formData.maxCapacity || 0) <= (formData.minCapacity || 0)) {
        setValidationError('Max capacity must be strictly greater than Min capacity.');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleSave = () => {
    const finalInstrument: Instrument = {
      id: `INST-${Date.now()}`,
      instrumentIdTag: formData.instrumentIdTag || `INST-${Date.now()}`,
      manufacturer: formData.manufacturer || 'Unknown',
      model: formData.model || 'Unknown',
      serialNumber: formData.serialNumber || 'N/A',
      instrumentType: formData.instrumentType as InstrumentType,
      accuracyClass: formData.accuracyClass as AccuracyClass,
      maxCapacity: Number(formData.maxCapacity),
      minCapacity: Number(formData.minCapacity),
      verificationScaleInterval: Number(formData.verificationScaleInterval),
      actualScaleInterval: Number(formData.actualScaleInterval || formData.verificationScaleInterval),
      unit: formData.unit as MassUnit,
      numberOfIntervals: Number(formData.numberOfIntervals),
      tareType: formData.tareType as any,
      maxTare: Number(formData.maxTare || formData.maxCapacity),
      additiveTare: Number(formData.additiveTare || 0),
      loadReceptorType: formData.loadReceptorType as LoadReceptorType,
      numberOfSupportPoints: Number(formData.numberOfSupportPoints || 4),
      platformDimensions: formData.platformDimensions || '',
      softwareVersion: formData.softwareVersion || 'v1.0',
      powerSupply: formData.powerSupply || '230V AC',
      operatingTemperatureMin: Number(formData.operatingTemperatureMin ?? -10),
      operatingTemperatureMax: Number(formData.operatingTemperatureMax ?? 40),
      patternApprovalNumber: formData.patternApprovalNumber || '',
      markingDetails: formData.markingDetails || '',
      laboratoryId: 'LAB-IND-001',
      components: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = db.saveInstrument(finalInstrument, currentUser);
    onSaved(saved);
  };

  const steps = [
    { num: 1, label: 'Identification' },
    { num: 2, label: 'Technical Specs' },
    { num: 3, label: 'Receptor & Platform' },
    { num: 4, label: 'Review & Confirm' },
  ];

  return (
    <div id="new-instrument-wizard" className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header & Stepper */}
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">
            New NAWI Registration Wizard
          </span>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Scale size={18} className="text-indigo-400" />
            Register Weighing Instrument Under Test
          </h2>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`p-3 text-center border-r border-slate-200 last:border-r-0 transition-colors ${
              currentStep === s.num
                ? 'bg-indigo-50/80 text-indigo-900 font-bold border-b-2 border-b-indigo-600'
                : currentStep > s.num
                ? 'text-emerald-700 font-medium'
                : 'text-slate-400 font-normal'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === s.num
                    ? 'bg-indigo-600 text-white'
                    : currentStep > s.num
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Form Body */}
      <div className="p-8 space-y-6">
        {validationError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-100">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Validation Requirement:</strong>
              {validationError}
            </div>
          </div>
        )}

        {/* Step 1: Identification */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 1: Instrument Identity & Marking</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Manufacturer *</label>
                <input
                  type="text"
                  placeholder="e.g. Mettler Toledo, Sartorius, Avery"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Model / Commercial Name *</label>
                <input
                  type="text"
                  placeholder="e.g. BBA231 Industrial Bench"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Serial Number *</label>
                <input
                  type="text"
                  placeholder="e.g. MT-2026-990182"
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Internal Tag / Asset ID</label>
                <input
                  type="text"
                  value={formData.instrumentIdTag || ''}
                  onChange={(e) => setFormData({ ...formData, instrumentIdTag: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Instrument Category</label>
                <select
                  value={formData.instrumentType}
                  onChange={(e) => setFormData({ ...formData, instrumentType: e.target.value as InstrumentType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Electronic Balance">Electronic Precision Balance</option>
                  <option value="Bench Scale">Industrial Bench Scale</option>
                  <option value="Floor / Platform Scale">Floor / Platform Scale</option>
                  <option value="Weighbridge">Heavy Weighbridge</option>
                  <option value="Crane Scale">Crane / Suspension Scale</option>
                  <option value="Hopper / Tank Scale">Hopper / Tank Scale</option>
                  <option value="Medical Scale">Medical Scale</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Pattern Approval Number</label>
                <input
                  type="text"
                  placeholder="e.g. IND-PAT-2026-0044"
                  value={formData.patternApprovalNumber || ''}
                  onChange={(e) => setFormData({ ...formData, patternApprovalNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Technical Specifications & OIML Table 3 */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Step 2: Metrological Parameters (OIML R 76-1 Table 3)
              </h3>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                n = {formData.numberOfIntervals?.toLocaleString()} intervals
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Accuracy Class (Table 3) *</label>
                <select
                  value={formData.accuracyClass}
                  onChange={(e) => setFormData({ ...formData, accuracyClass: e.target.value as AccuracyClass })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="CLASS_I">Class I (Special Accuracy)</option>
                  <option value="CLASS_II">Class II (High Accuracy)</option>
                  <option value="CLASS_III">Class III (Medium Accuracy)</option>
                  <option value="CLASS_IIII">Class IIII (Ordinary Accuracy)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Primary Mass Unit *</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as MassUnit })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="mg">Milligrams (mg)</option>
                  <option value="t">Metric Tonnes (t)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Verification Interval (e) *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.verificationScaleInterval || 0}
                  onChange={(e) =>
                    handleCapacityOrIntervalChange(Number(formData.maxCapacity || 0), parseFloat(e.target.value))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Maximum Capacity (Max) *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.maxCapacity || 0}
                  onChange={(e) =>
                    handleCapacityOrIntervalChange(parseFloat(e.target.value), Number(formData.verificationScaleInterval || 0))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Minimum Capacity (Min) *</label>
                <input
                  type="number"
                  step="any"
                  value={formData.minCapacity || 0}
                  onChange={(e) => setFormData({ ...formData, minCapacity: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Actual Scale Interval (d)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.actualScaleInterval || formData.verificationScaleInterval || 0}
                  onChange={(e) => setFormData({ ...formData, actualScaleInterval: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Info size={14} className="text-indigo-600" />
                <span>OIML R 76-1:2006 Table 3 Formula Verification:</span>
              </div>
              <p className="text-slate-600">
                Number of scale intervals n = Max / e = {formData.maxCapacity} / {formData.verificationScaleInterval} = <strong className="text-slate-900">{formData.numberOfIntervals?.toLocaleString()}</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Platform, Receptor & Electronics */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Step 3: Load Receptor, Tare & Operating Environment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Load Receptor Geometry</label>
                <select
                  value={formData.loadReceptorType}
                  onChange={(e) => setFormData({ ...formData, loadReceptorType: e.target.value as LoadReceptorType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Rectangular Platform">Rectangular Platform</option>
                  <option value="Flat Pan">Flat Pan</option>
                  <option value="Round Plate">Round Plate</option>
                  <option value="Weighbridge Deck">Weighbridge Deck (Multi-section)</option>
                  <option value="Hanging Hook">Hanging Hook / Crane</option>
                  <option value="Tank / Hopper">Tank / Hopper</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Number of Support Points (N) (Eccentricity formula)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.numberOfSupportPoints || 4}
                  onChange={(e) => setFormData({ ...formData, numberOfSupportPoints: parseInt(e.target.value) || 4 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tare Device Type</label>
                <select
                  value={formData.tareType}
                  onChange={(e) => setFormData({ ...formData, tareType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Subtractive">Subtractive Tare (T = -Max)</option>
                  <option value="Additive">Additive Tare (+T)</option>
                  <option value="Preset">Preset Tare</option>
                  <option value="None">None (No Tare Device)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Software / Firmware Build</label>
                <input
                  type="text"
                  placeholder="e.g. v2.10.4-OIML"
                  value={formData.softwareVersion || ''}
                  onChange={(e) => setFormData({ ...formData, softwareVersion: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Min Operating Temp (°C)</label>
                <input
                  type="number"
                  value={formData.operatingTemperatureMin ?? -10}
                  onChange={(e) => setFormData({ ...formData, operatingTemperatureMin: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Max Operating Temp (°C)</label>
                <input
                  type="number"
                  value={formData.operatingTemperatureMax ?? 40}
                  onChange={(e) => setFormData({ ...formData, operatingTemperatureMax: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Step 4: Final Confirmation & Legal Registry Entry
            </h3>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900">
                  {formData.manufacturer} {formData.model}
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                  Class {formData.accuracyClass?.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Serial Number:</span>
                  <span className="font-mono font-semibold text-slate-800">{formData.serialNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Max Capacity:</span>
                  <span className="font-semibold text-slate-800">{formData.maxCapacity} {formData.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Min Capacity:</span>
                  <span className="font-semibold text-slate-800">{formData.minCapacity} {formData.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scale Interval (e):</span>
                  <span className="font-semibold text-slate-800">{formData.verificationScaleInterval} {formData.unit}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Intervals (n):</span>
                  <span className="font-semibold text-slate-800">{formData.numberOfIntervals?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Receptor:</span>
                  <span className="font-semibold text-slate-800">{formData.loadReceptorType} ({formData.numberOfSupportPoints} pts)</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Upon clicking "Save Instrument", this instrument record will be persisted in the laboratory repository and eligible for starting OIML R-76 test sessions.
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((p) => Math.max(p - 1, 1))}
          disabled={currentStep === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
        >
          <ChevronLeft size={15} />
          Previous
        </button>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Next Step
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <CheckCircle2 size={16} />
            Save & Register Instrument
          </button>
        )}
      </div>
    </div>
  );
};
