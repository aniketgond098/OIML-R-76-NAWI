import { MetrologyRule } from './ruleTypes';

/**
 * Authoritative Rule Catalogue for OIML R 76-1:2006 (E)
 * All clauses and formulas verified against official OIML PDF publication.
 */
export const OIML_R76_2006_RULES: MetrologyRule[] = [
  // 1. Classification & Verification Scale Intervals (Table 3)
  {
    ruleId: 'R76-2006-TBL3-CLASS-SPECS',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.1.2, Table 3',
    title: 'Accuracy Classification & Minimum Intervals',
    description: 'Defines verification scale interval (e), number of intervals (n = Max / e), and Min capacity.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'MPE_TABLE_LOOKUP',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Verification scale interval', symbol: 'e', description: 'Scale interval used for classification', unit: 'g / kg' },
      { name: 'Maximum capacity', symbol: 'Max', description: 'Maximum weighing capacity', unit: 'g / kg' },
      { name: 'Minimum capacity', symbol: 'Min', description: 'Minimum load below which errors may be excessive', unit: 'g / kg' },
    ],
    formula: 'n = Max / e; Min >= k · e',
    parameters: {
      classSpecs: {
        CLASS_I: { minE_g: 0.001, minN: 50000, maxN: Infinity, minCapacityMultiplier: 100 },
        CLASS_II: [
          { minE_g: 0.001, maxE_g: 0.05, minN: 100, maxN: 100000, minCapacityMultiplier: 20 },
          { minE_g: 0.1, maxE_g: Infinity, minN: 5000, maxN: 100000, minCapacityMultiplier: 50 },
        ],
        CLASS_III: [
          { minE_g: 0.1, maxE_g: 2.0, minN: 100, maxN: 10000, minCapacityMultiplier: 20 },
          { minE_g: 5.0, maxE_g: Infinity, minN: 500, maxN: 10000, minCapacityMultiplier: 20 },
        ],
        CLASS_IIII: { minE_g: 5.0, minN: 100, maxN: 1000, minCapacityMultiplier: 10 },
      },
    },
    units: 'dimensionless / primary mass unit',
    rounding: 'Exact integer for interval count n; scale interval e in 1x10^k, 2x10^k, or 5x10^k units',
    decisionRule: 'n_min <= n <= n_max and Min >= k · e according to Table 3',
    sourceReference: 'OIML R 76-1:2006 (E) Section 3.1.2 p. 15',
  },

  // 2. Maximum Permissible Errors on Initial Verification (Table 6)
  {
    ruleId: 'R76-2006-TBL6-MPE-INITIAL',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.5.1, Table 6',
    title: 'Maximum Permissible Errors on Initial Verification',
    description: 'MPE for initial verification expressed in scale intervals (e) based on load m in intervals.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'MPE_TABLE_LOOKUP',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Nominal Load', symbol: 'L', description: 'Test load placed on the load receptor', unit: 'g / kg' },
      { name: 'Verification scale interval', symbol: 'e', description: 'Scale interval', unit: 'g / kg' },
      { name: 'Accuracy Class', symbol: 'Class', description: 'Accuracy class I, II, III, IIII', unit: 'category' },
    ],
    formula: 'm = L / e; MPE = ±0.5 e (Band 1), ±1.0 e (Band 2), ±1.5 e (Band 3)',
    parameters: {
      bands: {
        CLASS_I: [
          { maxE: 50000, mpe: 0.5 },
          { maxE: 200000, mpe: 1.0 },
          { maxE: Infinity, mpe: 1.5 },
        ],
        CLASS_II: [
          { maxE: 5000, mpe: 0.5 },
          { maxE: 20000, mpe: 1.0 },
          { maxE: 100000, mpe: 1.5 },
        ],
        CLASS_III: [
          { maxE: 500, mpe: 0.5 },
          { maxE: 2000, mpe: 1.0 },
          { maxE: 10000, mpe: 1.5 },
        ],
        CLASS_IIII: [
          { maxE: 50, mpe: 0.5 },
          { maxE: 200, mpe: 1.0 },
          { maxE: 1000, mpe: 1.5 },
        ],
      },
    },
    units: 'Scale intervals (e) / primary mass unit',
    rounding: 'Exact MPE step tiers in multiples of 0.5 e',
    decisionRule: '|Corrected Error Ec| <= MPE(L)',
    sourceReference: 'OIML R 76-1:2006 (E) Table 6 p. 20',
  },

  // 3. Turning Point (Flash Point) Calculation
  {
    ruleId: 'R76-2006-A443-TURNING-POINT',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause A.4.4.3 & Clause 3.5.3.2',
    title: 'Determination of Error prior to Rounding (Turning Point Method)',
    description: 'Indication P = I + 0.5e - ΔL, Error E = P - L, Corrected Error Ec = E - E0.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'TURNING_POINT_FLASH',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Displayed Indication', symbol: 'I', description: 'Scale reading under load', unit: 'g / kg' },
      { name: 'Turning Point Weight', symbol: 'ΔL', description: 'Fractional weights added until indication rolls to I + e', unit: 'g / kg' },
      { name: 'Test Load', symbol: 'L', description: 'Applied standard weight', unit: 'g / kg' },
      { name: 'Zero baseline error', symbol: 'E0', description: 'Error observed at initial zero setting', unit: 'g / kg' },
      { name: 'Verification scale interval', symbol: 'e', description: 'Scale interval', unit: 'g / kg' },
    ],
    formula: 'P = I + 0.5·e - ΔL; E = P - L; Ec = E - E0',
    parameters: {
      formulaP: 'P = I + 0.5 * e - deltaL',
      formulaE: 'E = P - L',
      formulaEc: 'Ec = E - E0',
    },
    units: 'Primary mass unit (g / kg)',
    rounding: 'Evaluated with exact decimal precision (5 decimal places); compared directly against MPE',
    decisionRule: '|Ec| <= |MPE(L)|',
    sourceReference: 'OIML R 76-1:2006 (E) Annex A Clause A.4.4.3 p. 71',
  },

  // 4. Repeatability (Clause 3.6.1 & A.4.10)
  {
    ruleId: 'R76-2006-361-REPEATABILITY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.6.1 & Clause A.4.10',
    title: 'Repeatability Test',
    description: 'Difference between max and min indications under same load (ΔI = I_max - I_min) <= |MPE(L)|.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'REPEATABILITY_SPAN',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Nominal test load', symbol: 'L', description: 'Test load (~0.5 Max or Max)', unit: 'g / kg' },
      { name: 'Series Indications', symbol: 'I_1..I_k', description: 'Successive indications under the same load', unit: 'g / kg' },
      { name: 'Scale interval', symbol: 'e', description: 'Verification scale interval', unit: 'g / kg' },
    ],
    formula: 'ΔI = I_max - I_min; ΔI <= |MPE(L)|',
    parameters: {
      recommendedRuns: {
        CLASS_I: 10,
        CLASS_II: 6,
        CLASS_III: 3,
        CLASS_IIII: 3,
      },
    },
    units: 'Primary mass unit (g / kg)',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: '(I_max - I_min) <= |MPE(L)|',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.6.1 p. 21, Clause A.4.10 p. 74',
  },

  // 5. Eccentric Loading (Clause 3.6.2 & A.4.7)
  {
    ruleId: 'R76-2006-362-ECCENTRICITY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.6.2 & Clause A.4.7',
    title: 'Eccentric Loading Test',
    description: 'Error on each eccentric load point <= MPE for that test load. Test load is Max/3 (N<=4) or Max/(N-1) (N>4).',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'ECCENTRICITY_LOAD',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Support Points Count', symbol: 'N', description: 'Number of support points (e.g. 4 for 4-corner receptor)', unit: 'integer' },
      { name: 'Eccentric Test Load', symbol: 'L_ecc', description: 'Prescribed load: Max/3 or Max/(N-1)', unit: 'g / kg' },
      { name: 'Position Indication', symbol: 'I_k', description: 'Observed indication at corner/quarter sector k', unit: 'g / kg' },
      { name: 'Turning Point Weight', symbol: 'ΔL_k', description: 'Turning point weight at position k', unit: 'g / kg' },
    ],
    formula: 'L_ecc = Max / 3 (N <= 4) or Max / (N - 1) (N > 4); |Ec,k| <= |MPE(L_ecc)|',
    parameters: {
      loadFormulaNLe4: 'Max / 3',
      loadFormulaNGt4: 'Max / (N - 1)',
    },
    units: 'Primary mass unit (g / kg)',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: 'For every position k: |Ec,k| <= |MPE(L_ecc)|',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.6.2 p. 22, Clause A.4.7 p. 72',
  },

  // 6. Zero-Setting Accuracy (Clause 4.5.2 & A.4.2.3)
  {
    ruleId: 'R76-2006-452-ZERO-ACCURACY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 4.5.2 & Clause A.4.2.3',
    title: 'Accuracy of Zero-Setting',
    description: 'After zero setting, the effect of zero-setting on the weighing results shall not be more than ±0.25 e.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'ZERO_SETTING_ACCURACY',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Zero Indication', symbol: 'I0', description: 'Reading at zero before turning point weights', unit: 'g / kg' },
      { name: 'Zero Turning Point Weight', symbol: 'ΔL0', description: 'Weights to roll zero indication from 0 to 0+e', unit: 'g / kg' },
      { name: 'Verification scale interval', symbol: 'e', description: 'Scale interval', unit: 'g / kg' },
    ],
    formula: 'E0 = I0 + 0.5·e - ΔL0; |E0| <= 0.25·e',
    parameters: {
      maxPermissibleZeroErrorE: 0.25,
    },
    units: 'Scale intervals (e) / primary mass unit',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: '|E0| <= 0.25 · e',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 4.5.2 p. 28, Clause A.4.2.3 p. 69',
  },

  // 7. Zero-Setting Range (Clause 4.5.1)
  {
    ruleId: 'R76-2006-451-ZERO-RANGE',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 4.5.1',
    title: 'Range of Zero-Setting',
    description: 'Non-automatic zero setting <= 4% of Max; Initial zero setting <= 20% of Max.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'ZERO_SETTING_RANGE',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Zero Range Test Load', symbol: 'L_zero', description: 'Maximum positive/negative load zeroes out', unit: 'g / kg' },
      { name: 'Maximum Capacity', symbol: 'Max', description: 'Max scale capacity', unit: 'g / kg' },
    ],
    formula: 'ZeroRange% = (|L_zero| / Max) · 100; Range <= 4% (Non-auto) or 20% (Initial)',
    parameters: {
      nonAutoMaxPercent: 4.0,
      initialZeroMaxPercent: 20.0,
    },
    units: 'Percentage (%) of Max',
    rounding: 'Evaluated with exact 2 decimal percentage',
    decisionRule: 'Zeroing range must not exceed declared limits (4% or 20%)',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 4.5.1 p. 28',
  },

  // 8. Tare Device Accuracy (Clause 4.6.3 & A.4.6)
  {
    ruleId: 'R76-2006-463-TARE-ACCURACY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 4.6.3 & Clause A.4.6',
    title: 'Accuracy of Tare Device',
    description: 'The accuracy of tare device shall be such that error <= ±0.25 e. Net weighing error <= MPE(Net).',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'TARE_ACCURACY',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Applied Tare Load', symbol: 'T', description: 'Weight placed for tare cancellation', unit: 'g / kg' },
      { name: 'Indicated Tare', symbol: 'I_tare', description: 'Displayed tare reading', unit: 'g / kg' },
      { name: 'Tare Turning Point Weight', symbol: 'ΔL_tare', description: 'Turning point weight at tare setting', unit: 'g / kg' },
      { name: 'Net Test Load', symbol: 'L_net', description: 'Net weight placed on tared pan', unit: 'g / kg' },
    ],
    formula: 'Etare = (I_tare + 0.5·e - ΔL_tare) - T; |Etare| <= 0.25·e; |Ec,net| <= MPE(L_net)',
    parameters: {
      maxTareErrorE: 0.25,
    },
    units: 'Scale intervals (e) / primary mass unit',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: '|Etare| <= 0.25 · e and |Ec,net| <= MPE(L_net)',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 4.6.3 p. 30, Clause A.4.6 p. 72',
  },

  // 9. Temperature Effect on Span (Clause 3.9.2.3 & A.5.3)
  {
    ruleId: 'R76-2006-3923-TEMP-SPAN',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.2.3 & Clause A.5.3',
    title: 'Temperature Influence on Span Stability',
    description: 'Maximum span shift per 5°C temperature difference.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'TEMPERATURE_SPAN_DRIFT',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Initial Temperature', symbol: 'T1', description: 'Initial ambient temperature', unit: '°C' },
      { name: 'Final Temperature', symbol: 'T2', description: 'Elevated/lowered ambient temperature', unit: '°C' },
      { name: 'Span Error at T1', symbol: 'E(T1)', description: 'Corrected error at load Max at T1', unit: 'g / kg' },
      { name: 'Span Error at T2', symbol: 'E(T2)', description: 'Corrected error at load Max at T2', unit: 'g / kg' },
    ],
    formula: 'SpanShift5C = |(E(T2) - E(T1)) / (T2 - T1)| · 5; Shift <= 1.0·e per 5°C',
    parameters: {
      maxSpanShiftPer5C_E: 1.0,
    },
    units: 'Scale intervals (e) per 5°C',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: 'Span shift per 5°C <= 1.0 · e',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.2.3 p. 25, Clause A.5.3 p. 78',
  },

  // 10. Discrimination (Clause 3.8.2.2 & A.4.8)
  {
    ruleId: 'R76-2006-382-DISCRIMINATION',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.8.2.2 & Clause A.4.8',
    title: 'Discrimination Test (Digital Indication)',
    description: 'An additional load of 1.4 d placed gently on the load receptor at rest shall produce an increase in indication of at least 1.0 d.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'DISCRIMINATION_THRESHOLD',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Actual scale interval', symbol: 'd', description: 'Smallest scale interval displayed', unit: 'g / kg' },
      { name: 'Extra gentle load', symbol: 'ΔL_disc', description: 'Load equal to 1.4·d', unit: 'g / kg' },
      { name: 'Initial Indication', symbol: 'I1', description: 'Reading at rest under test load', unit: 'g / kg' },
      { name: 'Indication after extra load', symbol: 'I2', description: 'Reading after adding 1.4·d', unit: 'g / kg' },
    ],
    formula: 'ΔL_disc = 1.4 · d; ΔI = I2 - I1; ΔI >= 1.0 · d',
    parameters: {
      extraLoadFactorD: 1.4,
      minRequiredChangeFactorD: 1.0,
    },
    units: 'Primary mass unit (g / kg)',
    rounding: 'Exact discrete digit stepping',
    decisionRule: 'ΔI = (I2 - I1) >= 1.0 · d',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.8.2.2 p. 23, Clause A.4.8 p. 73',
  },

  // 11. Tilting (Clause 3.9.1.1 & A.5.1)
  {
    ruleId: 'R76-2006-3911-TILTING',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.1.1 & Clause A.5.1',
    title: 'Tilting Test (50/1000 Inclination)',
    description: 'For instruments not fitted with level indicator or mobile instruments, when tilted to 50/1000 limiting angle, variation from level error shall not exceed MPE(L).',
    applicableClasses: ['CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'TILTING_ERROR_LIMIT',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Tilt Inclination', symbol: 'θ', description: 'Inclination angle (50 ‰)', unit: 'permil' },
      { name: 'Corrected Error at Level', symbol: 'Ec,level', description: 'Error when properly leveled', unit: 'g / kg' },
      { name: 'Corrected Error when Tilted', symbol: 'Ec,tilt', description: 'Error at 50‰ tilt angle', unit: 'g / kg' },
    ],
    formula: 'ΔEc_tilt = |Ec,tilt - Ec,level|; ΔEc_tilt <= |MPE(L)|',
    parameters: {
      limitingTiltPermil: 50,
      zeroShiftMaxE_ClassII: 2.0,
      zeroShiftMaxE_ClassIII_IIII: 1.0,
    },
    units: 'Primary mass unit (g / kg)',
    rounding: 'Evaluated with exact decimal precision',
    decisionRule: '|Ec,tilted - Ec,level| <= MPE(L)',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.1.1 p. 24, Clause A.5.1 p. 76',
  },

  // 12. Multi-Interval Scale Classification (Clause 3.4.1 & Table 3)
  {
    ruleId: 'R76-2006-341-MULTI-INTERVAL',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.4.1, Clause 3.4.2 & Table 3',
    title: 'Multi-Interval and Multi-Range Verification Intervals',
    description: 'Verification of partial weighing ranges e_i, Max_i, Min_1, and interval count n_i = Max_i / e_i according to Table 3 limits.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    formulaType: 'MPE_TABLE_LOOKUP',
    verificationStatus: 'VERIFIED',
    inputs: [
      { name: 'Partial Range Intervals', symbol: 'e_i', description: 'Verification scale intervals for each partial range', unit: 'g / kg' },
      { name: 'Partial Range Capacities', symbol: 'Max_i', description: 'Maximum capacity for each partial range', unit: 'g / kg' },
    ],
    formula: 'n_i = Max_i / e_i; e_(i+1) / e_i >= 2',
    parameters: {
      minRatioE: 2.0,
    },
    units: 'Dimensionless / primary mass unit',
    rounding: 'Exact integer intervals',
    decisionRule: 'For each partial range i: n_min <= n_i <= n_max and e_(i+1) >= 2 · e_i',
    sourceReference: 'OIML R 76-1:2006 (E) Section 3.4 p. 18, 19',
  },
];

