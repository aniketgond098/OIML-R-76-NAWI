import { Instrument } from '../../types/instrument';
import {
  ApplicabilityEvaluationResult,
  ApplicabilityStatus,
  OIMLSequencingRule,
} from './sequencingTypes';

/**
 * Applicability Engine for OIML R 76 Non-Automatic Weighing Instruments
 * Evaluates whether a test rule applies to a specific instrument configuration.
 *
 * Absolute Metrology Safety Rule:
 * NEVER guess or interpolate applicability.
 * If data is missing -> return INSUFFICIENT_DATA with field names.
 * If rule is unverified -> return UNVERIFIED and prevent automatic compliance.
 */
export class ApplicabilityEngine {
  /**
   * Evaluates applicability of a single rule against an instrument configuration
   */
  public evaluateRuleApplicability(
    instrument: Instrument,
    rule: OIMLSequencingRule
  ): ApplicabilityEvaluationResult {
    // 1. Check Unverified status first:
    if (rule.verificationStatus === 'UNVERIFIED') {
      return {
        status: 'UNVERIFIED',
        reason:
          'This rule has not been verified against the authoritative OIML source and cannot automatically determine compliance.',
        conditionMetDescription: `Rule ${rule.ruleId} is marked UNVERIFIED in the rule registry.`,
        notes: rule.notes || 'Expert metrological configuration and manual review required.',
      };
    }

    // 2. Check for missing required instrument fields
    const missing: (keyof Instrument)[] = [];
    for (const field of rule.requiredInstrumentFields) {
      const val = (instrument as any)[field];
      if (val === undefined || val === null || val === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        reason: `Cannot determine test applicability because the following instrument fields are missing: ${missing.join(', ')}.`,
        conditionMetDescription: `Missing parameters: ${missing.join(', ')}.`,
        missingFields: missing,
      };
    }

    // 3. Delegate to deterministic rule evaluator
    try {
      const result = rule.evaluateApplicability(instrument);
      return result;
    } catch (err: any) {
      return {
        status: 'INSUFFICIENT_DATA',
        reason: `Error evaluating rule condition: ${err?.message || 'Unknown evaluation failure'}.`,
        conditionMetDescription: 'Evaluation failed due to incomplete or malformed instrument data.',
      };
    }
  }

  /**
   * Batch evaluate all rules in a rule set against an instrument
   */
  public evaluateAllRules(
    instrument: Instrument,
    rules: OIMLSequencingRule[]
  ): Map<string, ApplicabilityEvaluationResult> {
    const results = new Map<string, ApplicabilityEvaluationResult>();
    for (const rule of rules) {
      results.set(rule.ruleId, this.evaluateRuleApplicability(instrument, rule));
    }
    return results;
  }
}

export const applicabilityEngine = new ApplicabilityEngine();
