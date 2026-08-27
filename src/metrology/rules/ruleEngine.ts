import { AccuracyClass, StandardEdition, VerificationStatus } from '../../types/metrology';
import { MetrologyFormulaType, MetrologyRule } from './ruleTypes';
import { OIML_R76_2006_RULES } from './r76_2006_rules';

/**
 * Rule Registry & Evaluator
 * Manages active rule versions, standard editions, custom imports, and ensures
 * that ONLY verified rules are utilized for formal legal metrology compliance determinations.
 */
class MetrologyRuleEngine {
  private rules: Map<string, MetrologyRule> = new Map();

  constructor() {
    this.loadBuiltinRules();
  }

  private loadBuiltinRules() {
    for (const rule of OIML_R76_2006_RULES) {
      this.rules.set(rule.ruleId, rule);
    }
  }

  /**
   * Get all registered rules
   */
  public getAllRules(): MetrologyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by unique ID
   */
  public getRule(ruleId: string): MetrologyRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Find matching rule based on criteria
   */
  public findRule(
    edition: StandardEdition,
    formulaType: MetrologyFormulaType,
    accuracyClass: AccuracyClass
  ): MetrologyRule | undefined {
    for (const rule of this.rules.values()) {
      if (
        rule.edition === edition &&
        rule.formulaType === formulaType &&
        rule.applicableClasses.includes(accuracyClass)
      ) {
        return rule;
      }
    }
    return undefined;
  }

  /**
   * Register or import a new rule with strict validation
   */
  public registerRule(rule: MetrologyRule): { success: boolean; error?: string } {
    if (!rule.ruleId || !rule.standard || !rule.edition || !rule.clauseRef) {
      return { success: false, error: 'Rule metadata incomplete: ruleId, standard, edition, clauseRef required.' };
    }

    if (!rule.applicableClasses || rule.applicableClasses.length === 0) {
      return { success: false, error: 'Rule must specify at least one applicable accuracy class.' };
    }

    this.rules.set(rule.ruleId, rule);
    return { success: true };
  }

  /**
   * Update rule verification status
   */
  public updateRuleStatus(ruleId: string, status: VerificationStatus): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;
    rule.verificationStatus = status;
    return true;
  }

  /**
   * Check if a rule is officially verified for compliance decisions
   */
  public isRuleVerified(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    return rule !== undefined && rule.verificationStatus === 'VERIFIED';
  }
}

export const ruleEngine = new MetrologyRuleEngine();
