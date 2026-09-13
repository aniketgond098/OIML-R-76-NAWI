import { Instrument } from '../../types/instrument';
import { TestPlanItem, TestSession } from '../../types/testSession';
import { StandardEdition } from '../../types/metrology';
import { oimlRuleRegistry } from './oimlRuleRegistry';
import { applicabilityEngine } from './applicabilityEngine';
import { testDependencyResolver } from './testDependencyResolver';
import {
  RuleDecisionContext,
  SmartTestPlan,
  SmartTestPlanItem,
} from './sequencingTypes';

export const CURRENT_SEQUENCING_ENGINE_VERSION = 'OIML-R76-SEQ-v1.0.0';

/**
 * Smart Test Sequencing Engine for OIML R 76-1:2006 NAWI
 * Rule-driven metrology workflow engine providing deterministic applicability,
 * dependency resolution, audit decision context logging, and finalized report protection.
 */
export class TestSequencingEngine {
  /**
   * Generates a deterministic Smart Test Plan from instrument configuration
   */
  public generateSmartTestPlan(
    instrument: Instrument,
    session?: TestSession,
    edition: StandardEdition = 'OIML R 76-1:2006'
  ): SmartTestPlan {
    // 1. Fetch verified rules for selected standard edition
    const rules = oimlRuleRegistry.getRulesForEdition(edition);

    // 2. Evaluate deterministic applicability for all rules
    const applicabilityMap = applicabilityEngine.evaluateAllRules(instrument, rules);

    // 3. Resolve dependencies, completion states, and execution order
    const items = testDependencyResolver.resolvePlan(rules, applicabilityMap, session);

    // 4. Compute audit decision contexts for total reproducibility
    const auditDecisionContexts: Record<string, RuleDecisionContext> = {};
    const timestamp = new Date().toISOString();

    for (const item of items) {
      const rule = rules.find((r) => r.ruleId === item.ruleId);
      const appResult = applicabilityMap.get(item.ruleId);

      // Extract relevant instrument snapshot fields
      const instrumentFieldsEvaluated: Partial<Record<keyof Instrument, any>> = {};
      if (rule?.requiredInstrumentFields) {
        for (const field of rule.requiredInstrumentFields) {
          instrumentFieldsEvaluated[field] = (instrument as any)[field];
        }
      }

      auditDecisionContexts[item.testId] = {
        ruleId: item.ruleId,
        testId: item.testId,
        ruleVersion: `${item.standard}:${item.edition}`,
        engineVersion: CURRENT_SEQUENCING_ENGINE_VERSION,
        timestamp,
        instrumentFieldsEvaluated,
        applicabilityResult: item.applicabilityStatus,
        applicabilityReason: item.applicabilityReason,
        dependenciesEvaluated: item.dependencies.map((dep) => {
          const prereqItem = items.find((i) => i.testId === dep.prerequisiteTestId);
          const satisfied = prereqItem ? prereqItem.executionStatus === 'COMPLETED' : false;
          return {
            prerequisiteTestId: dep.prerequisiteTestId,
            prerequisiteName: dep.prerequisiteName,
            satisfied,
            stateFound: prereqItem?.executionStatus || 'NOT_STARTED',
            complianceFound: prereqItem?.complianceStatus,
            reason: dep.description,
          };
        }),
        resultingState: item.executionStatus,
        verificationStatus: item.verificationStatus,
      };
    }

    // 5. Compute summary statistics
    const summary = {
      totalTests: items.length,
      applicableCount: items.filter((i) => i.applicabilityStatus === 'APPLICABLE').length,
      readyCount: items.filter((i) => i.executionStatus === 'READY').length,
      lockedCount: items.filter((i) => i.executionStatus === 'LOCKED').length,
      completedCount: items.filter((i) => i.executionStatus === 'COMPLETED').length,
      blockedCount: items.filter((i) => i.executionStatus === 'BLOCKED').length,
      notApplicableCount: items.filter((i) => i.applicabilityStatus === 'NOT_APPLICABLE').length,
      insufficientDataCount: items.filter((i) => i.applicabilityStatus === 'INSUFFICIENT_DATA').length,
      unverifiedCount: items.filter((i) => i.applicabilityStatus === 'UNVERIFIED').length,
    };

    const isFinalized =
      session?.status === 'APPROVED' ||
      session?.status === 'REPORT_GENERATED';

    return {
      id: `PLAN-${instrument.id}-${Date.now()}`,
      instrumentId: instrument.id,
      instrumentSnapshot: { ...instrument },
      standardEdition: edition,
      ruleSetVersion: `OIML-R76-2006-SEQ`,
      engineVersion: CURRENT_SEQUENCING_ENGINE_VERSION,
      generatedAt: timestamp,
      updatedAt: timestamp,
      isFinalized,
      items,
      summary,
      auditDecisionContexts,
    };
  }

  /**
   * Recalculates test plan execution states (e.g. when tests complete or fail)
   * while strictly protecting finalized reports from mutation.
   */
  public recalculateTestPlanState(
    currentPlan: SmartTestPlan,
    session: TestSession
  ): SmartTestPlan {
    // FINALIZED REPORT PROTECTION RULE:
    // Once a report is approved or finalized, the plan and decisions are frozen.
    if (currentPlan.isFinalized || session.status === 'APPROVED' || session.status === 'REPORT_GENERATED') {
      return {
        ...currentPlan,
        isFinalized: true,
      };
    }

    const rules = oimlRuleRegistry.getRulesForEdition(currentPlan.standardEdition);
    const applicabilityMap = applicabilityEngine.evaluateAllRules(currentPlan.instrumentSnapshot, rules);
    const updatedItems = testDependencyResolver.resolvePlan(rules, applicabilityMap, session);

    // Refresh summary
    const summary = {
      totalTests: updatedItems.length,
      applicableCount: updatedItems.filter((i) => i.applicabilityStatus === 'APPLICABLE').length,
      readyCount: updatedItems.filter((i) => i.executionStatus === 'READY').length,
      lockedCount: updatedItems.filter((i) => i.executionStatus === 'LOCKED').length,
      completedCount: updatedItems.filter((i) => i.executionStatus === 'COMPLETED').length,
      blockedCount: updatedItems.filter((i) => i.executionStatus === 'BLOCKED').length,
      notApplicableCount: updatedItems.filter((i) => i.applicabilityStatus === 'NOT_APPLICABLE').length,
      insufficientDataCount: updatedItems.filter((i) => i.applicabilityStatus === 'INSUFFICIENT_DATA').length,
      unverifiedCount: updatedItems.filter((i) => i.applicabilityStatus === 'UNVERIFIED').length,
    };

    return {
      ...currentPlan,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
      summary,
    };
  }

  /**
   * Detects whether an instrument's metrological configuration has changed
   * since the test plan was generated.
   */
  public detectConfigurationChange(
    snapshot: Instrument,
    current: Instrument
  ): { hasChanged: boolean; differences: string[] } {
    const differences: string[] = [];

    if (snapshot.accuracyClass !== current.accuracyClass) {
      differences.push(
        `Accuracy Class changed from ${snapshot.accuracyClass} to ${current.accuracyClass}`
      );
    }
    if (snapshot.maxCapacity !== current.maxCapacity) {
      differences.push(
        `Max Capacity changed from ${snapshot.maxCapacity} to ${current.maxCapacity}`
      );
    }
    if (snapshot.minCapacity !== current.minCapacity) {
      differences.push(
        `Min Capacity changed from ${snapshot.minCapacity} to ${current.minCapacity}`
      );
    }
    if (snapshot.verificationScaleInterval !== current.verificationScaleInterval) {
      differences.push(
        `Scale Interval (e) changed from ${snapshot.verificationScaleInterval} to ${current.verificationScaleInterval}`
      );
    }
    if (snapshot.actualScaleInterval !== current.actualScaleInterval) {
      differences.push(
        `Actual Scale Interval (d) changed from ${snapshot.actualScaleInterval} to ${current.actualScaleInterval}`
      );
    }
    if (snapshot.tareType !== current.tareType) {
      differences.push(
        `Tare Type changed from ${snapshot.tareType || 'None'} to ${current.tareType || 'None'}`
      );
    }
    if (snapshot.loadReceptorType !== current.loadReceptorType) {
      differences.push(
        `Load Receptor changed from ${snapshot.loadReceptorType} to ${current.loadReceptorType}`
      );
    }
    if (snapshot.numberOfSupportPoints !== current.numberOfSupportPoints) {
      differences.push(
        `Support Points changed from ${snapshot.numberOfSupportPoints} to ${current.numberOfSupportPoints}`
      );
    }

    return {
      hasChanged: differences.length > 0,
      differences,
    };
  }

  /**
   * Backwards-compatibility adapter:
   * Maps a SmartTestPlan into the legacy TestPlanItem[] array expected by
   * existing reports and summaries.
   */
  public toLegacyTestPlan(smartPlan: SmartTestPlan): TestPlanItem[] {
    return smartPlan.items.map((item) => ({
      category: item.testCategory,
      name: item.testName,
      clauseRef: `${item.standard}:${item.edition}, ${item.clauseRef}`,
      isApplicable: item.applicabilityStatus === 'APPLICABLE',
      isMandatory: item.isMandatory,
      status:
        item.executionStatus === 'COMPLETED'
          ? 'COMPLETED'
          : item.executionStatus === 'IN_PROGRESS'
          ? 'IN_PROGRESS'
          : item.applicabilityStatus === 'NOT_APPLICABLE'
          ? 'SKIPPED'
          : 'PENDING',
      compliance: item.complianceStatus,
      reasonForInapplicability:
        item.applicabilityStatus !== 'APPLICABLE' ? item.applicabilityReason : undefined,
    }));
  }
}

export const testSequencingEngine = new TestSequencingEngine();
