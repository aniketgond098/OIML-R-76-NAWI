import { Instrument } from '../../types/instrument';
import { OIMLSequencingRule } from './sequencingTypes';

/**
 * Authoritative Rule Registry for OIML R 76-1:2006 Non-Automatic Weighing Instruments
 * Source of Truth: International Organization of Legal Metrology, Recommendation OIML R 76-1:2006 (E)
 * URL: https://www.oiml.org/en/files/pdf_r/r076-1-e06.pdf
 *
 * NOTE: Unverified rules are explicitly marked as 'UNVERIFIED' and must never silently
 * become active compliance requirements without expert metrological configuration.
 */

export const OIML_R76_2006_SEQUENCING_RULES: OIMLSequencingRule[] = [
  // 1. Zero-Setting and Zero-Tracking Accuracy
  {
    ruleId: 'R76-2006-SEQ-ZERO-SETTING',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 4.5.2 & Clause A.4.2',
    tableRef: 'Clause 4.5.2 (Table 6 Reference)',
    testId: 'TEST-OIML-ZERO',
    testCategory: 'ZERO_SETTING',
    testName: 'Zero-Setting & Zero-Tracking Accuracy Test',
    description:
      'Determination of error at zero (E0 = I0 + 0.5e - ΔL0). The effect of zero-setting on weighing results shall not exceed ±0.25 e. Precedence: must establish baseline zero error prior to span and eccentricity evaluations.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 4.5.2 p. 28, Clause A.4.2 p. 69',
    notes: 'Mandatory for all instruments equipped with zero-setting mechanisms. Forms baseline E0 for corrected error Ec = E - E0.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['accuracyClass', 'verificationScaleInterval', 'maxCapacity'],
    defaultSequenceOrder: 1,
    isMandatory: true,
    enabled: true,
    workflowTab: 'zerotare',
    prerequisites: [], // Initial entry point in verification sequence
    evaluateApplicability: (instrument: Instrument) => {
      // Check required fields
      const missing: (keyof Instrument)[] = [];
      if (!instrument.accuracyClass) missing.push('accuracyClass');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine applicability because critical instrument metrology parameters are missing.',
          conditionMetDescription: 'Requires defined accuracy class, Max, and verification scale interval (e).',
          missingFields: missing,
        };
      }

      return {
        status: 'APPLICABLE',
        reason:
          'Clause 4.5.2 requires all non-automatic weighing instruments with zero-setting mechanisms to maintain zero error within ±0.25 e.',
        conditionMetDescription: `Applicable to Class ${instrument.accuracyClass.replace('CLASS_', '')} NAWI with Max = ${instrument.maxCapacity} ${instrument.unit}, e = ${instrument.verificationScaleInterval} ${instrument.unit}.`,
      };
    },
  },

  // 2. Eccentric Loading Test
  {
    ruleId: 'R76-2006-SEQ-ECCENTRICITY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.6.2 & Clause A.4.7',
    tableRef: 'Table 6 (MPE Limits for Eccentric Load)',
    testId: 'TEST-OIML-ECCENTRICITY',
    testCategory: 'ECCENTRICITY',
    testName: 'Eccentric Loading Test',
    description:
      'Application of load off-center (Max/3 for N <= 4 or Max/(N-1) for N > 4). Error at each eccentric position shall not exceed the maximum permissible error for that load. Conducted before full weighing to verify platform corner balance.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.6.2 p. 22, Clause A.4.7 p. 72',
    notes:
      'Exempts single-point suspension instruments such as hanging hooks or crane scales where off-center loading is physically impossible.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['loadReceptorType', 'numberOfSupportPoints', 'maxCapacity', 'verificationScaleInterval'],
    defaultSequenceOrder: 2,
    isMandatory: true,
    enabled: true,
    workflowTab: 'eccentricity',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-ZERO',
        prerequisiteName: 'Zero-Setting & Zero-Tracking Accuracy Test',
        requiredState: 'COMPLETED',
        requirePassingCompliance: true,
        description: 'Zero baseline must be established and verified within ±0.25 e before eccentric load testing (Clause A.4.7).',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (!instrument.loadReceptorType) missing.push('loadReceptorType');
      if (instrument.numberOfSupportPoints === undefined || instrument.numberOfSupportPoints === null)
        missing.push('numberOfSupportPoints');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine eccentricity applicability because load receptor characteristics are missing.',
          conditionMetDescription: 'Requires loadReceptorType and numberOfSupportPoints.',
          missingFields: missing,
        };
      }

      // Hanging Hook / single suspension point is explicitly exempt per Clause 3.6.2
      if (instrument.loadReceptorType === 'Hanging Hook') {
        return {
          status: 'NOT_APPLICABLE',
          reason:
            'Clause 3.6.2 exempts hanging hook and single-point suspension instruments where eccentric loading is not applicable due to universal joint or pivot design.',
          conditionMetDescription: 'Instrument load receptor is configured as Hanging Hook.',
        };
      }

      return {
        status: 'APPLICABLE',
        reason: `Clause 3.6.2 requires eccentric loading verification for ${instrument.loadReceptorType} with ${instrument.numberOfSupportPoints} support points. Prescribed load: ${instrument.numberOfSupportPoints <= 4 ? '1/3 Max' : `1/(${instrument.numberOfSupportPoints} - 1) Max`}.`,
        conditionMetDescription: `Load receptor: ${instrument.loadReceptorType}, N = ${instrument.numberOfSupportPoints}.`,
      };
    },
  },

  // 3. Weighing Performance & Accuracy Test
  {
    ruleId: 'R76-2006-SEQ-WEIGHING-ACCURACY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.5.1 & Clause A.4.4',
    tableRef: 'Table 6 (MPE on Initial Verification)',
    testId: 'TEST-OIML-WEIGHING',
    testCategory: 'WEIGHING_ACCURACY',
    testName: 'Weighing Performance & Accuracy Test (Ascending & Descending)',
    description:
      'Loading from zero up to Max and back to zero with turning point error determination (P = I + 0.5e - ΔL). Evaluates corrected error Ec = E - E0 against Table 6 MPE steps (±0.5 e, ±1.0 e, ±1.5 e).',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.5.1 p. 20, Clause A.4.4 p. 70',
    notes: 'Core mandatory test for all non-automatic weighing instruments.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['accuracyClass', 'verificationScaleInterval', 'maxCapacity', 'minCapacity'],
    defaultSequenceOrder: 3,
    isMandatory: true,
    enabled: true,
    workflowTab: 'weighing',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-ZERO',
        prerequisiteName: 'Zero-Setting & Zero-Tracking Accuracy Test',
        requiredState: 'COMPLETED',
        requirePassingCompliance: true,
        description: 'Zero error E0 must be measured and verified <= ±0.25 e to calculate corrected errors Ec = E - E0 (Clause A.4.4.3).',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (!instrument.accuracyClass) missing.push('accuracyClass');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');
      if (instrument.minCapacity === undefined || instrument.minCapacity === null || instrument.minCapacity < 0)
        missing.push('minCapacity');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine weighing performance requirements because scale interval or capacity parameters are missing.',
          conditionMetDescription: 'Requires accuracyClass, verificationScaleInterval, maxCapacity, and minCapacity.',
          missingFields: missing,
        };
      }

      return {
        status: 'APPLICABLE',
        reason:
          'Clause 3.5.1 and Clause A.4.4 mandate weighing performance evaluation with at least 5 test points ascending and descending across Min to Max.',
        conditionMetDescription: `All Class ${instrument.accuracyClass.replace('CLASS_', '')} NAWIs must satisfy Table 6 MPE limits.`,
      };
    },
  },

  // 4. Repeatability Test
  {
    ruleId: 'R76-2006-SEQ-REPEATABILITY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.6.1 & Clause A.4.10',
    tableRef: 'Clause 3.6.1 (Table 6 MPE Comparison)',
    testId: 'TEST-OIML-REPEATABILITY',
    testCategory: 'REPEATABILITY',
    testName: 'Repeatability Test (at ~0.5 Max and Max)',
    description:
      'Series of successive weighings under identical test loads. The difference between the maximum and minimum indications (ΔI = I_max - I_min) shall not exceed the absolute value of the maximum permissible error for that load.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.6.1 p. 21, Clause A.4.10 p. 74',
    notes: 'Mandatory for all accuracy classes. Minimum series runs: Class I: 10, Class II: 6, Class III/IIII: 3.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['accuracyClass', 'maxCapacity', 'verificationScaleInterval'],
    defaultSequenceOrder: 4,
    isMandatory: true,
    enabled: true,
    workflowTab: 'repeatability',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-WEIGHING',
        prerequisiteName: 'Weighing Performance & Accuracy Test',
        requiredState: 'COMPLETED',
        requirePassingCompliance: true,
        description: 'Weighing performance and scale span accuracy must be confirmed prior to repeatability series testing.',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (!instrument.accuracyClass) missing.push('accuracyClass');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine repeatability series requirements because capacity or verification interval is missing.',
          conditionMetDescription: 'Requires accuracyClass, maxCapacity, and verificationScaleInterval.',
          missingFields: missing,
        };
      }

      return {
        status: 'APPLICABLE',
        reason:
          'Clause 3.6.1 mandates repeatability evaluation to confirm reproducibility of weighing results under identical load conditions.',
        conditionMetDescription: `Applicable to Class ${instrument.accuracyClass.replace('CLASS_', '')} instruments at ~0.5 Max and Max.`,
      };
    },
  },

  // 5. Tare Device Accuracy and Net Weighing
  {
    ruleId: 'R76-2006-SEQ-TARE-ACCURACY',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 4.6.3 & Clause A.4.6',
    tableRef: 'Clause 4.6.3 (Table 6 Net MPE Reference)',
    testId: 'TEST-OIML-TARE',
    testCategory: 'TARE',
    testName: 'Tare Mechanism Accuracy & Net Weighing Test',
    description:
      'Determination of tare balancing accuracy (Etare <= ±0.25 e) and verification that net weighing errors remain within maximum permissible errors for the corresponding net load.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 4.6.3 p. 30, Clause A.4.6 p. 72',
    notes: 'Applicable strictly when instrument incorporates a tare balancing or tare weighing mechanism.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['tareType', 'verificationScaleInterval', 'maxCapacity'],
    defaultSequenceOrder: 5,
    isMandatory: false,
    enabled: true,
    workflowTab: 'zerotare',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-WEIGHING',
        prerequisiteName: 'Weighing Performance & Accuracy Test',
        requiredState: 'COMPLETED',
        requirePassingCompliance: true,
        description: 'Gross weighing accuracy must be verified prior to testing tare subtraction and net weighing points.',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      // Check required fields
      const missing: (keyof Instrument)[] = [];
      if (instrument.tareType === undefined) missing.push('tareType');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine tare test applicability because tareType configuration is not defined.',
          conditionMetDescription: 'Requires instrument tareType specification (Subtractive, Additive, Preset, or None).',
          missingFields: missing,
        };
      }

      if (instrument.tareType === 'None') {
        return {
          status: 'NOT_APPLICABLE',
          reason:
            'Instrument is not fitted with a tare device (tareType = None). Clause 4.6 tare requirements do not apply.',
          conditionMetDescription: 'Instrument configuration explicitly specifies no tare facility.',
        };
      }

      return {
        status: 'APPLICABLE',
        reason: `Clause 4.6.3 mandates accuracy testing for instruments fitted with a ${instrument.tareType} tare mechanism.`,
        conditionMetDescription: `Tare facility present: ${instrument.tareType} tare. Max tare: ${instrument.maxTare || instrument.maxCapacity} ${instrument.unit}.`,
      };
    },
  },

  // 6. Discrimination Test
  {
    ruleId: 'R76-2006-SEQ-DISCRIMINATION',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.8.2.2 & Clause A.4.8',
    tableRef: 'Clause 3.8.2.2',
    testId: 'TEST-OIML-DISCRIMINATION',
    testCategory: 'DISCRIMINATION',
    testName: 'Discrimination Test (1.4 d Digital Threshold)',
    description:
      'An additional load equal to 1.4 d gently placed on the load receptor at rest shall produce an increase in displayed indication of at least 1.0 d.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.8.2.2 p. 23, Clause A.4.8 p. 73',
    notes: 'Applies to digital indication NAWIs. Performed during pattern evaluation or when specified by verification regime.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['actualScaleInterval', 'maxCapacity'],
    defaultSequenceOrder: 6,
    isMandatory: false,
    enabled: true,
    workflowTab: 'weighing',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-WEIGHING',
        prerequisiteName: 'Weighing Performance & Accuracy Test',
        requiredState: 'COMPLETED',
        description: 'Standard scale resolution and weighing response should be verified prior to discrimination threshold check.',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (!instrument.actualScaleInterval || instrument.actualScaleInterval <= 0) missing.push('actualScaleInterval');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine discrimination test applicability because actual scale interval (d) is missing.',
          conditionMetDescription: 'Requires actualScaleInterval (d).',
          missingFields: missing,
        };
      }

      return {
        status: 'APPLICABLE',
        reason:
          'Clause 3.8.2.2 applies to digital non-automatic weighing instruments to verify sensitivity to a 1.4 d load increment.',
        conditionMetDescription: `Digital indicator with d = ${instrument.actualScaleInterval} ${instrument.unit}. Extra test load = ${1.4 * instrument.actualScaleInterval} ${instrument.unit}.`,
      };
    },
  },

  // 7. Tilting Test (50/1000 inclination)
  {
    ruleId: 'R76-2006-SEQ-TILTING',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.1.1 & Clause A.5.1',
    tableRef: 'Clause 3.9.1.1 (50 ‰ limiting inclination)',
    testId: 'TEST-OIML-TILTING',
    testCategory: 'TILTING',
    testName: 'Tilting Test (50/1000 Limiting Inclination)',
    description:
      'For Class II, III, and IIII instruments that are mobile or not fitted with a level indicator: when tilted to 50/1000, error variation from level position shall not exceed MPE.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.1.1 p. 24, Clause A.5.1 p. 76',
    notes: 'Class I instruments are explicitly exempt from tilting test under Clause 3.9.1.1.',
    applicableClasses: ['CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['accuracyClass', 'maxCapacity', 'verificationScaleInterval'],
    defaultSequenceOrder: 7,
    isMandatory: false,
    enabled: true,
    workflowTab: 'environmental',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-ZERO',
        prerequisiteName: 'Zero-Setting & Zero-Tracking Accuracy Test',
        requiredState: 'COMPLETED',
        description: 'Level baseline zero and error must be established before inclination comparison.',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (!instrument.accuracyClass) missing.push('accuracyClass');
      if (!instrument.maxCapacity || instrument.maxCapacity <= 0) missing.push('maxCapacity');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot determine tilting test applicability because accuracy class is undefined.',
          conditionMetDescription: 'Requires accuracyClass, maxCapacity, and verificationScaleInterval.',
          missingFields: missing,
        };
      }

      // Class I instruments are explicitly exempt per Clause 3.9.1.1
      if (instrument.accuracyClass === 'CLASS_I') {
        return {
          status: 'NOT_APPLICABLE',
          reason:
            'Clause 3.9.1.1 explicitly exempts Class I (Special Accuracy) instruments from the 50‰ tilting test.',
          conditionMetDescription: 'Instrument is designated as Accuracy Class I.',
        };
      }

      return {
        status: 'APPLICABLE',
        reason:
          'Clause 3.9.1.1 applies to Class II, III, and IIII mobile or leveling-dependent instruments to verify tilt resistance.',
        conditionMetDescription: `Applicable to Class ${instrument.accuracyClass.replace('CLASS_', '')} instrument.`,
      };
    },
  },

  // 8. Static Temperature and Span Stability
  {
    ruleId: 'R76-2006-SEQ-TEMP-SPAN',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.2.3 & Clause A.5.3',
    tableRef: 'Clause 3.9.2.3 (Span shift <= 1.0 e per 5°C)',
    testId: 'TEST-OIML-TEMP-SPAN',
    testCategory: 'TEMPERATURE_SPAN',
    testName: 'Static Temperature & Span Stability Test',
    description:
      'Evaluates span stability across prescribed temperature ranges (e.g. -10°C to +40°C). Maximum permissible span shift per 5°C temperature difference is 1.0 e.',
    verificationStatus: 'VERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.2.3 p. 25, Clause A.5.3 p. 78',
    notes: 'Influence factor evaluation typically required for pattern evaluation or environmental qualification.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['operatingTemperatureMin', 'operatingTemperatureMax', 'verificationScaleInterval'],
    defaultSequenceOrder: 8,
    isMandatory: false,
    enabled: true,
    workflowTab: 'environmental',
    prerequisites: [
      {
        prerequisiteTestId: 'TEST-OIML-WEIGHING',
        prerequisiteName: 'Weighing Performance & Accuracy Test',
        requiredState: 'COMPLETED',
        description: 'Room-temperature span calibration must be established prior to temperature drift analysis.',
      },
    ],
    evaluateApplicability: (instrument: Instrument) => {
      const missing: (keyof Instrument)[] = [];
      if (instrument.operatingTemperatureMin === undefined || instrument.operatingTemperatureMin === null)
        missing.push('operatingTemperatureMin');
      if (instrument.operatingTemperatureMax === undefined || instrument.operatingTemperatureMax === null)
        missing.push('operatingTemperatureMax');
      if (!instrument.verificationScaleInterval || instrument.verificationScaleInterval <= 0)
        missing.push('verificationScaleInterval');

      if (missing.length > 0) {
        return {
          status: 'INSUFFICIENT_DATA',
          reason: 'Cannot evaluate temperature span requirements because operating temperature limits are not defined.',
          conditionMetDescription: 'Requires operatingTemperatureMin and operatingTemperatureMax.',
          missingFields: missing,
        };
      }

      return {
        status: 'APPLICABLE',
        reason: `Clause 3.9.2.3 specifies temperature span stability across declared limits (${instrument.operatingTemperatureMin}°C to +${instrument.operatingTemperatureMax}°C).`,
        conditionMetDescription: `Operating range: ${instrument.operatingTemperatureMin}°C to +${instrument.operatingTemperatureMax}°C. Span shift limit: <= 1.0 e / 5°C.`,
      };
    },
  },

  // 9. UNVERIFIED RULE EXAMPLE: Durability / Endurance Test (Clause 3.9.4.3 & A.6)
  // Per Absolute Metrology Safety Rule: "If a rule has not been verified against the authoritative OIML source,
  // the application MUST NOT use that rule to make an automatic compliance decision. Unverified rules may be
  // displayed as unavailable or requiring expert configuration, but must never silently become active requirements."
  {
    ruleId: 'R76-2006-SEQ-DURABILITY-UNVERIFIED',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.4.3 & Clause A.6',
    tableRef: 'Clause 3.9.4.3',
    testId: 'TEST-OIML-DURABILITY',
    testCategory: 'DURABILITY_DISTURBANCE',
    testName: 'Repetitive Loading Durability Test (100,000 cycles)',
    description:
      'Long-term durability examination under repetitive mechanical loading. UNVERIFIED in current automated software workflow; requires specialized motorized cyclic test bench configuration and metrology committee approval.',
    verificationStatus: 'UNVERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.4.3 p. 27, Annex A Clause A.6 p. 86',
    notes:
      'RULE NOT VERIFIED FOR AUTOMATIC SEQUENCING. Displayed for metrology registry completeness but blocked from automatic execution.',
    applicableClasses: ['CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['maxCapacity'],
    defaultSequenceOrder: 9,
    isMandatory: false,
    enabled: false,
    workflowTab: 'environmental',
    prerequisites: [],
    evaluateApplicability: (_instrument: Instrument) => {
      return {
        status: 'UNVERIFIED',
        reason:
          'This durability rule has not been fully verified for automated compliance in this software build and cannot automatically determine testing requirements.',
        conditionMetDescription: 'Pending domain-expert laboratory validation under Clause 3.9.4.3.',
        notes: 'Manual Review & Expert Metrological Configuration Required.',
      };
    },
  },

  // 10. UNVERIFIED RULE EXAMPLE: Damp Heat Steady State Test (Clause A.5.4)
  {
    ruleId: 'R76-2006-SEQ-DAMP-HEAT-UNVERIFIED',
    standard: 'OIML R 76-1',
    edition: 'OIML R 76-1:2006',
    clauseRef: 'Clause 3.9.2.2 & Clause A.5.4',
    tableRef: 'Clause A.5.4',
    testId: 'TEST-OIML-DAMP-HEAT',
    testCategory: 'DURABILITY_DISTURBANCE',
    testName: 'Damp Heat Steady State Test (40°C, 93% RH)',
    description:
      'Environmental damp heat exposure for 48 hours in climatic chamber. UNVERIFIED in software for automatic routine field verification; reserved for pattern evaluation laboratories.',
    verificationStatus: 'UNVERIFIED',
    sourceReference: 'OIML R 76-1:2006 (E) Clause 3.9.2.2 p. 25, Clause A.5.4 p. 80',
    notes: 'UNVERIFIED for automatic field execution.',
    applicableClasses: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IIII'],
    requiredInstrumentFields: ['operatingTemperatureMax'],
    defaultSequenceOrder: 10,
    isMandatory: false,
    enabled: false,
    workflowTab: 'environmental',
    prerequisites: [],
    evaluateApplicability: (_instrument: Instrument) => {
      return {
        status: 'UNVERIFIED',
        reason:
          'Damp heat steady state test requires controlled climatic chamber protocol and is UNVERIFIED for routine automatic field verification sequencing.',
        conditionMetDescription: 'Climatic chamber test specification pending verification.',
        notes: 'Manual Review & Expert Metrological Configuration Required.',
      };
    },
  },
];

/**
 * Rule Registry Service
 * Manages versioned standard rules (e.g. OIML R 76-1:2006) and future editions.
 */
class OIMLRuleRegistry {
  private rulesByEdition: Map<string, OIMLSequencingRule[]> = new Map();

  constructor() {
    this.rulesByEdition.set('OIML R 76-1:2006', [...OIML_R76_2006_SEQUENCING_RULES]);
  }

  /**
   * Get all registered rules for a given standard edition
   */
  public getRulesForEdition(edition: string = 'OIML R 76-1:2006'): OIMLSequencingRule[] {
    const rules = this.rulesByEdition.get(edition);
    if (!rules) {
      // Fallback to 2006 if edition unknown
      return this.rulesByEdition.get('OIML R 76-1:2006') || [];
    }
    return rules;
  }

  /**
   * Find a rule by its stable rule ID
   */
  public getRuleById(ruleId: string): OIMLSequencingRule | undefined {
    for (const ruleList of this.rulesByEdition.values()) {
      const found = ruleList.find((r) => r.ruleId === ruleId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Find a rule by its test ID
   */
  public getRuleByTestId(testId: string): OIMLSequencingRule | undefined {
    for (const ruleList of this.rulesByEdition.values()) {
      const found = ruleList.find((r) => r.testId === testId);
      if (found) return found;
    }
    return undefined;
  }
}

export const oimlRuleRegistry = new OIMLRuleRegistry();
