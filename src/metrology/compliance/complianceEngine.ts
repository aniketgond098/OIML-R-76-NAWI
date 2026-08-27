import { ComplianceStatus } from '../../types/metrology';
import { Instrument } from '../../types/instrument';
import { TestPlanItem, TestSession } from '../../types/testSession';
import { ruleEngine } from '../rules/ruleEngine';

/**
 * Generate Applicable Test Plan based on Instrument Metrological Characteristics
 * Reference: OIML R 76-1:2006, Chapter 3 & Chapter 4
 */
export function generateTestPlanForInstrument(instrument: Instrument): TestPlanItem[] {
  const plan: TestPlanItem[] = [];

  // 1. Weighing / Accuracy Test (Mandatory for all NAWI)
  plan.push({
    category: 'WEIGHING_ACCURACY',
    name: 'Weighing Performance & Accuracy Test (Ascending & Descending)',
    clauseRef: 'OIML R 76-1:2006, Clause 3.5.1 & Clause A.4.4',
    isApplicable: true,
    isMandatory: true,
    status: 'PENDING',
    compliance: 'NOT_EVALUATED',
  });

  // 2. Repeatability Test (Mandatory for all NAWI)
  plan.push({
    category: 'REPEATABILITY',
    name: 'Repeatability Test (at ~0.5 Max and Max)',
    clauseRef: 'OIML R 76-1:2006, Clause 3.6.1 & Clause A.4.10',
    isApplicable: true,
    isMandatory: true,
    status: 'PENDING',
    compliance: 'NOT_EVALUATED',
  });

  // 3. Eccentric Loading Test (Mandatory if load receptor supports non-central placement)
  const isEccentricApplicable = instrument.loadReceptorType !== 'Hanging Hook';
  plan.push({
    category: 'ECCENTRICITY',
    name: `Eccentric Loading Test (${instrument.numberOfSupportPoints || 4} points / receptor geometry)`,
    clauseRef: 'OIML R 76-1:2006, Clause 3.6.2 & Clause A.4.7',
    isApplicable: isEccentricApplicable,
    isMandatory: isEccentricApplicable,
    status: isEccentricApplicable ? 'PENDING' : 'SKIPPED',
    compliance: isEccentricApplicable ? 'NOT_EVALUATED' : 'PASS',
    reasonForInapplicability: isEccentricApplicable ? undefined : 'Single-point suspension / hanging hook receptor.',
  });

  // 4. Zero-Setting & Zero-Tracking Test (Mandatory for instruments with zero mechanism)
  plan.push({
    category: 'ZERO_SETTING',
    name: 'Zero-Setting & Zero-Tracking Accuracy Test (<= 0.25 e)',
    clauseRef: 'OIML R 76-1:2006, Clause 4.5.2 & Clause A.4.2',
    isApplicable: true,
    isMandatory: true,
    status: 'PENDING',
    compliance: 'NOT_EVALUATED',
  });

  // 5. Tare Device Accuracy & Net Weighing Test
  const isTareApplicable = instrument.tareType && instrument.tareType !== 'None';
  plan.push({
    category: 'TARE',
    name: `Tare Mechanism Accuracy (${instrument.tareType || 'Subtractive'}) & Net Weighing Test`,
    clauseRef: 'OIML R 76-1:2006, Clause 4.6 & Clause A.4.6',
    isApplicable: !!isTareApplicable,
    isMandatory: !!isTareApplicable,
    status: isTareApplicable ? 'PENDING' : 'SKIPPED',
    compliance: isTareApplicable ? 'NOT_EVALUATED' : 'PASS',
    reasonForInapplicability: isTareApplicable ? undefined : 'Instrument does not incorporate a tare device.',
  });

  // 6. Discrimination Test (Clause 3.8 & A.4.8)
  plan.push({
    category: 'DISCRIMINATION',
    name: 'Discrimination Test (1.4d digital increment response)',
    clauseRef: 'OIML R 76-1:2006, Clause 3.8 & Clause A.4.8',
    isApplicable: true,
    isMandatory: false, // Performed during pattern approval / initial verification when specified
    status: 'SKIPPED',
    compliance: 'NOT_EVALUATED',
    reasonForInapplicability: 'Conducted when specified by test regime or type examination.',
  });

  // 7. Tilting Test (Clause 3.9.1.1 & A.5.1)
  const isTiltingApplicable = instrument.accuracyClass !== 'CLASS_I';
  plan.push({
    category: 'TILTING',
    name: 'Tilting Test (50/1000 inclination sensitivity)',
    clauseRef: 'OIML R 76-1:2006, Clause 3.9.1.1 & Clause A.5.1',
    isApplicable: isTiltingApplicable,
    isMandatory: false, // For non-level-indicator or mobile instruments
    status: 'SKIPPED',
    compliance: 'NOT_EVALUATED',
    reasonForInapplicability: isTiltingApplicable
      ? 'Conducted for instruments not fitted with level indicator or mobile scales.'
      : 'Class I instruments are exempted from 50‰ tilt test (Clause 3.9.1.1).',
  });

  // 8. Temperature Influence on Span (Influence Factor)
  plan.push({
    category: 'TEMPERATURE_SPAN',
    name: 'Static Temperature & Span Stability Test',
    clauseRef: 'OIML R 76-1:2006, Clause 3.9.2.3 & Clause A.5.3',
    isApplicable: true,
    isMandatory: false, // Optional during routine pattern/field verification unless required by test regime
    status: 'SKIPPED',
    compliance: 'NOT_EVALUATED',
    reasonForInapplicability: 'Conducted during full pattern evaluation or when specified by testing authority.',
  });

  return plan;
}

/**
 * Evaluate Overall Compliance across all test categories
 * 
 * Rules:
 * - If any mandatory applicable test is FAIL -> OVERALL RESULT is FAIL
 * - If any mandatory applicable test is NOT_EVALUATED -> OVERALL RESULT is NOT_EVALUATED
 * - ONLY if all mandatory applicable tests are PASS -> OVERALL RESULT is PASS
 */
export function evaluateOverallTestSessionCompliance(session: TestSession): {
  overallCompliance: ComplianceStatus;
  summary: {
    totalApplicableTests: number;
    passedCount: number;
    failedCount: number;
    notEvaluatedCount: number;
    summaryNotes: string;
  };
  legalStatement: string;
} {
  let passedCount = 0;
  let failedCount = 0;
  let notEvaluatedCount = 0;
  let totalApplicable = 0;

  const notes: string[] = [];

  for (const item of session.testPlan) {
    if (!item.isApplicable || item.status === 'SKIPPED') {
      continue;
    }

    totalApplicable++;

    if (item.compliance === 'PASS') {
      passedCount++;
      notes.push(`✓ ${item.name}: PASSED`);
    } else if (item.compliance === 'FAIL') {
      failedCount++;
      notes.push(`✗ ${item.name}: FAILED (Tolerance limit exceeded)`);
    } else {
      notEvaluatedCount++;
      notes.push(`○ ${item.name}: NOT EVALUATED (Incomplete data or unverified rule)`);
    }
  }

  let overallCompliance: ComplianceStatus = 'NOT_EVALUATED';
  let legalStatement = '';

  if (failedCount > 0) {
    overallCompliance = 'FAIL';
    legalStatement = `The non-automatic weighing instrument DOES NOT COMPLY with the requirements of OIML Recommendation R 76-1:2006 (E) due to tolerance violations in ${failedCount} test module(s).`;
  } else if (notEvaluatedCount > 0 || totalApplicable === 0) {
    overallCompliance = 'NOT_EVALUATED';
    legalStatement = `The evaluation is INCOMPLETE. ${notEvaluatedCount} applicable test module(s) remain unverified or lack complete physical observation data.`;
  } else if (passedCount === totalApplicable) {
    overallCompliance = 'PASS';
    legalStatement = `The non-automatic weighing instrument COMPLIES with all verified legal metrology requirements of OIML Recommendation R 76-1:2006 (E) for Accuracy ${session.instrumentSnapshot.accuracyClass.replace('_', ' ')}.`;
  }

  return {
    overallCompliance,
    summary: {
      totalApplicableTests: totalApplicable,
      passedCount,
      failedCount,
      notEvaluatedCount,
      summaryNotes: notes.join('\n'),
    },
    legalStatement,
  };
}
