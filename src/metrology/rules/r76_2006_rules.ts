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
    decisionCriteria: 'Instrument parameters must satisfy boundary conditions in Table 3.',
    sourceReference: 'OIML R 76-1:2006 (E) p. 15',
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
    decisionCriteria: '|Corrected Error Ec| <= MPE(m)',
    sourceReference: 'OIML R 76-1:2006 (E) p. 20',
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
    parameters: {
      formulaP: 'P = I + 0.5 * e - deltaL',
      formulaE: 'E = P - L',
      formulaEc: 'Ec = E - E0',
    },
    decisionCriteria: '|Ec| <= MPE(L)',
    sourceReference: 'OIML R 76-1:2006 (E) Annex A p. 71',
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
    parameters: {
      recommendedRuns: {
        CLASS_I: 10,
        CLASS_II: 6,
        CLASS_III: 3,
        CLASS_IIII: 3,
      },
    },
    decisionCriteria: '(I_max - I_min) <= |MPE(L)|',
    sourceReference: 'OIML R 76-1:2006 (E) p. 21, 74',
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
    parameters: {
      loadFormulaNLe4: 'Max / 3',
      loadFormulaNGt4: 'Max / (N - 1)',
    },
    decisionCriteria: 'For every position k: |Ec,k| <= |MPE(L)|',
    sourceReference: 'OIML R 76-1:2006 (E) p. 22, 72',
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
    parameters: {
      maxPermissibleZeroErrorE: 0.25,
    },
    decisionCriteria: '|E0| <= 0.25 * e',
    sourceReference: 'OIML R 76-1:2006 (E) p. 28, 69',
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
    parameters: {
      nonAutoMaxPercent: 4.0,
      initialZeroMaxPercent: 20.0,
    },
    decisionCriteria: 'Zeroing range must not exceed declared limits.',
    sourceReference: 'OIML R 76-1:2006 (E) p. 28',
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
    parameters: {
      maxTareErrorE: 0.25,
    },
    decisionCriteria: '|Etare| <= 0.25 * e and |Ec,net| <= MPE(Net)',
    sourceReference: 'OIML R 76-1:2006 (E) p. 30, 72',
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
    parameters: {
      maxSpanShiftPer5C_E: 1.0, // 1 e per 5°C for Class II, III, IIII
    },
    decisionCriteria: '|(E(T2) - E(T1)) / (T2 - T1) * 5| <= 1.0 * e',
    sourceReference: 'OIML R 76-1:2006 (E) p. 25, 78',
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
    parameters: {
      extraLoadFactorD: 1.4,
      minRequiredChangeFactorD: 1.0,
    },
    decisionCriteria: 'ΔI = (I_after - I_before) >= 1.0 * d',
    sourceReference: 'OIML R 76-1:2006 (E) p. 23, 73',
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
    parameters: {
      limitingTiltPermil: 50,
      zeroShiftMaxE_ClassII: 2.0,
      zeroShiftMaxE_ClassIII_IIII: 1.0,
    },
    decisionCriteria: '|Ec,tilted - Ec,level| <= MPE(L)',
    sourceReference: 'OIML R 76-1:2006 (E) p. 24, 76',
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
    parameters: {
      minRatioE: 2.0, // e_(i+1) / e_i >= 2
    },
    decisionCriteria: 'For each partial range i: n_min <= n_i <= n_max and e_(i+1) >= 2 * e_i',
    sourceReference: 'OIML R 76-1:2006 (E) p. 18, 19',
  },
];
