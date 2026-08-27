import React, { useState } from 'react';
import { calculateWeighingError, getMPEInE } from '../../metrology/calculations/weighing';
import { calculateRepeatability } from '../../metrology/calculations/repeatability';
import { calculateEccentricityPosition, getRecommendedEccentricityLoad } from '../../metrology/calculations/eccentricity';
import { calculateZeroSetting } from '../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../metrology/calculations/tare';
import { calculateTemperatureSpan } from '../../metrology/calculations/environmental';
import { evaluateOverallTestSessionCompliance } from '../../metrology/compliance/complianceEngine';
import { SEED_INSTRUMENTS } from '../../services/storage/seedData';
import { Play, CheckCircle2, XCircle, ShieldCheck, RefreshCw, Layers, Calculator } from 'lucide-react';

interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  clause: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes: string;
}

export const MetrologyVerificationSuite: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestCaseResult[]>([]);

  const runAllVerificationTests = () => {
    setIsRunning(true);
    const testResults: TestCaseResult[] = [];

    const instClass3 = SEED_INSTRUMENTS[1]; // Class III, Max 15kg, e=0.005kg, d=0.005kg

    // Test 1: Turning Point Method Equation (P = I + 0.5e - ΔL)
    // I = 10.000, e = 0.005, ΔL = 0.002 -> P = 10.000 + 0.0025 - 0.002 = 10.0005
    const tp1 = calculateWeighingError({
      nominalLoadL: 10.0,
      indicatedValueI: 10.0,
      turningPointDeltaL: 0.002,
      verificationScaleIntervalE: 0.005,
      unit: 'kg',
      accuracyClass: 'CLASS_III',
      zeroErrorE0: 0,
    });

    testResults.push({
      id: 'TC-TP-01',
      name: 'Turning Point Flash Method True Indication (P = I + 0.5e - ΔL)',
      category: 'Weighing Calculator',
      clause: 'Clause A.4.4.3',
      expected: 'P = 10.0005, Ec = +0.0005',
      actual: `P = ${tp1.calculatedIndicationP.toFixed(4)}, Ec = ${tp1.correctedErrorEc > 0 ? '+' : ''}${tp1.correctedErrorEc.toFixed(4)}`,
      passed: Math.abs(tp1.calculatedIndicationP - 10.0005) < 1e-6 && Math.abs(tp1.correctedErrorEc - 0.0005) < 1e-6,
      notes: 'Verifies sub-interval turning point arithmetic with decimal.js precision.',
    });

    // Test 2: Table 6 MPE Stepped Envelope for Class III
    // Load 1: 2.0 kg (400e <= 500e) -> MPE = 0.5e = 0.0025 kg
    const mpe1 = getMPEInE('CLASS_III', 400);
    testResults.push({
      id: 'TC-MPE-01',
      name: 'Class III Tier 1 MPE (0 <= m <= 500e)',
      category: 'MPE Limits',
      clause: 'Table 6 (Clause 3.5.1)',
      expected: '±0.5 e',
      actual: `±${mpe1.mpeE} e`,
      passed: mpe1.mpeE === 0.5,
      notes: 'Initial verification MPE tier 1 exact boundary.',
    });

    // Test 3: Table 6 MPE Tier 2 (500e < m <= 2000e) -> MPE = 1.0e
    const mpe2 = getMPEInE('CLASS_III', 1000);
    testResults.push({
      id: 'TC-MPE-02',
      name: 'Class III Tier 2 MPE (500e < m <= 2000e)',
      category: 'MPE Limits',
      clause: 'Table 6 (Clause 3.5.1)',
      expected: '±1.0 e',
      actual: `±${mpe2.mpeE} e`,
      passed: mpe2.mpeE === 1.0,
      notes: 'Initial verification MPE tier 2 intermediate load range.',
    });

    // Test 4: Table 6 MPE Tier 3 (m > 2000e) -> MPE = 1.5e
    const mpe3 = getMPEInE('CLASS_III', 2500);
    testResults.push({
      id: 'TC-MPE-03',
      name: 'Class III Tier 3 MPE (2000e < m <= 10000e)',
      category: 'MPE Limits',
      clause: 'Table 6 (Clause 3.5.1)',
      expected: '±1.5 e',
      actual: `±${mpe3.mpeE} e`,
      passed: mpe3.mpeE === 1.5,
      notes: 'Initial verification MPE tier 3 capacity load range.',
    });

    // Test 5: Repeatability (ΔI <= |MPE|)
    const repRes = calculateRepeatability({
      nominalLoadL: 7.5,
      readings: [
        { runIndex: 1, zeroIndication: 0, indicatedValue: 7.500 },
        { runIndex: 2, zeroIndication: 0, indicatedValue: 7.505 },
        { runIndex: 3, zeroIndication: 0, indicatedValue: 7.500 },
      ],
      verificationScaleIntervalE: 0.005,
      unit: 'kg',
      accuracyClass: 'CLASS_III',
    });

    testResults.push({
      id: 'TC-REP-01',
      name: 'Repeatability Maximum Difference (ΔI = I_max - I_min)',
      category: 'Repeatability Test',
      clause: 'Clause 3.6.1 & A.4.10',
      expected: 'ΔI = 0.0050 kg, MPE = ±0.0050 kg, Result = PASS',
      actual: `ΔI = ${repRes.deltaI.toFixed(4)} kg, Result = ${repRes.compliance}`,
      passed: repRes.deltaI === 0.005 && repRes.compliance === 'PASS',
      notes: 'ΔI does not exceed |MPE| of 1.0e (0.005 kg) at 1500e load.',
    });

    // Test 6: Eccentricity Recommended Load Formula
    const eccLoad = getRecommendedEccentricityLoad(15.0, 4);
    testResults.push({
      id: 'TC-ECC-01',
      name: 'Eccentric Load Recommendation (N <= 4 support points)',
      category: 'Eccentricity Test',
      clause: 'Clause 3.6.2.1',
      expected: '5.0 kg ((1/3)·Max)',
      actual: `${eccLoad.recommendedLoad} kg`,
      passed: Math.abs(eccLoad.recommendedLoad - 5.0) < 1e-4,
      notes: '1/3 Max formula verified for 4-support point standard receptor.',
    });

    // Test 7: Zero Setting Accuracy (|E0| <= 0.25e)
    const zeroRes = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.0025,
      verificationScaleIntervalE: 0.005,
      unit: 'kg',
      maxCapacity: 15.0,
    });

    testResults.push({
      id: 'TC-ZERO-01',
      name: 'Zero-Setting Error Accuracy (E0 = I0 + 0.5e - ΔL0 <= 0.25e)',
      category: 'Zero & Tare',
      clause: 'Clause 4.5.2 & A.4.2.3',
      expected: 'E0 = 0.0000 kg, Tolerance = ±0.00125 kg, Result = PASS',
      actual: `E0 = ${zeroRes.calculatedZeroErrorE0.toFixed(5)} kg, Result = ${zeroRes.compliance}`,
      passed: zeroRes.compliance === 'PASS' && zeroRes.calculatedZeroErrorE0 === 0,
      notes: 'Exact zero point centering verified.',
    });

    // Test 8: Tare Device Accuracy (|Etare| <= 0.25e)
    const tareRes = calculateTare({
      tareLoadAppliedT: 5.0,
      indicatedTareI: 5.0,
      turningPointDeltaLTare: 0.0025,
      verificationScaleIntervalE: 0.005,
      unit: 'kg',
      accuracyClass: 'CLASS_III',
      netTestPoints: [
        { nominalNetLoad: 5.0, indicatedNet: 5.0, turningPointDeltaL: 0.0025 },
      ],
    });

    testResults.push({
      id: 'TC-TARE-01',
      name: 'Tare Setting Accuracy & Net Load Evaluation',
      category: 'Zero & Tare',
      clause: 'Clause 4.6.3 & A.4.6',
      expected: 'Etare = 0.0000 kg, Result = PASS',
      actual: `Etare = ${tareRes.calculatedTareErrorEtare.toFixed(5)} kg, Result = ${tareRes.compliance}`,
      passed: tareRes.compliance === 'PASS' && tareRes.calculatedTareErrorEtare === 0,
      notes: 'Subtractive tare mechanism tolerance verified.',
    });

    setResults(testResults);
    setIsRunning(false);
  };

  return (
    <div id="metrology-qa-suite" className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck size={22} className="text-emerald-600 shrink-0" />
            <span>OIML R 76-1:2006 Metrological Engine Verification Suite</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated formal arithmetic test harness executing mathematical assertions against OIML standard clauses
          </p>
        </div>

        <button
          id="btn-run-all-qa-tests"
          onClick={runAllVerificationTests}
          disabled={isRunning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors disabled:opacity-50 shrink-0"
        >
          {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          Execute All Verification Test Cases
        </button>
      </div>

      {/* Summary Card */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Test Cases</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{results.length}</div>
          </div>
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">Passed</span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              {results.filter((r) => r.passed).length}
            </div>
          </div>
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-rose-600 uppercase">Failed</span>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">
              {results.filter((r) => !r.passed).length}
            </div>
          </div>
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-600 uppercase">Compliance Pass Rate</span>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1">
              {((results.filter((r) => r.passed).length / results.length) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                <th className="p-3 pl-4">Test Case ID</th>
                <th className="p-3">Category</th>
                <th className="p-3">Governing Clause</th>
                <th className="p-3">Assertion Specification</th>
                <th className="p-3">Expected Result</th>
                <th className="p-3">Engine Output</th>
                <th className="p-3 pr-4 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                    Click "Execute All Verification Test Cases" above to validate the metrology engine.
                  </td>
                </tr>
              ) : (
                results.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50">
                    <td className="p-3 pl-4 font-bold text-indigo-700 font-sans">{tc.id}</td>
                    <td className="p-3 font-sans text-slate-600">{tc.category}</td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">{tc.clause}</td>
                    <td className="p-3 font-sans font-semibold text-slate-900">{tc.name}</td>
                    <td className="p-3 text-slate-600">{tc.expected}</td>
                    <td className="p-3 font-bold text-slate-800">{tc.actual}</td>
                    <td className="p-3 pr-4 text-right font-sans">
                      {tc.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[11px] border border-emerald-200">
                          <CheckCircle2 size={13} /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold text-[11px] border border-rose-200">
                          <XCircle size={13} /> FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
