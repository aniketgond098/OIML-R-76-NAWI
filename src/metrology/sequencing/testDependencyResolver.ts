import { TestSession } from '../../types/testSession';
import { ComplianceStatus } from '../../types/metrology';
import {
  ApplicabilityEvaluationResult,
  OIMLSequencingRule,
  SequencingDependency,
  SmartTestPlanItem,
  SmartTestState,
} from './sequencingTypes';

export interface TestExecutionProgress {
  isCompleted: boolean;
  isInProgress: boolean;
  compliance: ComplianceStatus;
}

/**
 * Inspects a TestSession to determine real-world execution progress and compliance
 * for a given test category.
 */
export function inspectTestProgressInSession(
  testCategory: string,
  session?: TestSession
): TestExecutionProgress {
  if (!session) {
    return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
  }

  switch (testCategory) {
    case 'ZERO_SETTING': {
      const obs = session.zeroSettingObservation;
      if (!obs) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      const isCompleted = obs.turningPointDeltaL0 !== undefined && obs.turningPointDeltaL0 !== null;
      return {
        isCompleted,
        isInProgress: !isCompleted,
        compliance: obs.compliance || 'NOT_EVALUATED',
      };
    }

    case 'ECCENTRICITY': {
      const obsList = session.eccentricityObservations || [];
      if (obsList.length === 0) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      // Standard platforms require at least 4 corner/support points
      const isCompleted = obsList.length >= 4 && obsList.every((o) => o.indicatedValue !== undefined && o.indicatedValue > 0);
      const anyFail = obsList.some((o) => o.compliance === 'FAIL');
      const allPass = isCompleted && obsList.every((o) => o.compliance === 'PASS');
      return {
        isCompleted,
        isInProgress: !isCompleted && obsList.length > 0,
        compliance: anyFail ? 'FAIL' : allPass ? 'PASS' : 'NOT_EVALUATED',
      };
    }

    case 'WEIGHING_ACCURACY': {
      const obsList = session.weighingObservations || [];
      if (obsList.length === 0) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      // Routine weighing test has at least 5 points ascending/descending
      const isCompleted = obsList.length >= 5 && obsList.every((o) => o.indicatedValue !== undefined);
      const anyFail = obsList.some((o) => o.compliance === 'FAIL');
      const allPass = isCompleted && obsList.every((o) => o.compliance === 'PASS');
      return {
        isCompleted,
        isInProgress: !isCompleted && obsList.length > 0,
        compliance: anyFail ? 'FAIL' : allPass ? 'PASS' : 'NOT_EVALUATED',
      };
    }

    case 'REPEATABILITY': {
      const seriesList = session.repeatabilitySeries || [];
      if (seriesList.length === 0) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      const isCompleted = seriesList.length >= 1 && seriesList.every((s) => s.readings && s.readings.length >= 3);
      const anyFail = seriesList.some((s) => s.compliance === 'FAIL');
      const allPass = isCompleted && seriesList.every((s) => s.compliance === 'PASS');
      return {
        isCompleted,
        isInProgress: !isCompleted && seriesList.length > 0,
        compliance: anyFail ? 'FAIL' : allPass ? 'PASS' : 'NOT_EVALUATED',
      };
    }

    case 'TARE': {
      const obs = session.tareObservation;
      if (!obs) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      const isCompleted = obs.indicatedTare !== undefined && (obs.netTestPoints?.length ?? 0) > 0;
      return {
        isCompleted,
        isInProgress: !isCompleted,
        compliance: obs.compliance || 'NOT_EVALUATED',
      };
    }

    case 'DISCRIMINATION': {
      const obs = session.discriminationObservation;
      if (!obs) return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      const isCompleted = obs.indicationAfterLoadI2 !== undefined && obs.indicationAfterLoadI2 > 0;
      return {
        isCompleted,
        isInProgress: !isCompleted,
        compliance: obs.compliance || 'NOT_EVALUATED',
      };
    }

    case 'TILTING': {
      const obs = session.tiltingObservation;
      if (!obs || !obs.positions || obs.positions.length === 0) {
        return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
      }
      const isCompleted = obs.positions.length >= 2;
      return {
        isCompleted,
        isInProgress: !isCompleted,
        compliance: obs.compliance || 'NOT_EVALUATED',
      };
    }

    case 'TEMPERATURE_SPAN': {
      const obs = session.temperatureSpanObservation;
      if (obs && obs.temperatures && obs.temperatures.length >= 2) {
        return {
          isCompleted: true,
          isInProgress: false,
          compliance: obs.compliance || 'NOT_EVALUATED',
        };
      }

      // Fallback: If environmental readings have at least 2 stages recorded (e.g. START and END)
      const envReadings = session.environmentalReadings || [];
      const hasStartAndEnd =
        envReadings.length >= 2 &&
        envReadings.some((r) => r.stage === 'START') &&
        envReadings.some((r) => r.stage === 'END' || r.stage === 'INTERMEDIATE');

      if (hasStartAndEnd) {
        return {
          isCompleted: true,
          isInProgress: false,
          compliance: 'PASS',
        };
      }

      if (envReadings.length > 0 || (obs?.temperatures?.length ?? 0) > 0) {
        return {
          isCompleted: false,
          isInProgress: true,
          compliance: 'NOT_EVALUATED',
        };
      }

      return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
    }

    default:
      return { isCompleted: false, isInProgress: false, compliance: 'NOT_EVALUATED' };
  }
}

/**
 * Dependency Resolver:
 * Evaluates prerequisites across applicable tests and computes current execution states
 * (READY, LOCKED, BLOCKED, COMPLETED, IN_PROGRESS, etc.)
 */
export class TestDependencyResolver {
  /**
   * Resolves execution states and sequence ordering
   */
  public resolvePlan(
    rules: OIMLSequencingRule[],
    applicabilityMap: Map<string, ApplicabilityEvaluationResult>,
    session?: TestSession
  ): SmartTestPlanItem[] {
    // 1. First Pass: Compute progress and initial state for each rule
    const progressMap = new Map<string, TestExecutionProgress>();
    for (const rule of rules) {
      progressMap.set(rule.testId, inspectTestProgressInSession(rule.testCategory, session));
    }

    // 2. Second Pass: Evaluate prerequisites and assign states
    const items: SmartTestPlanItem[] = [];

    for (const rule of rules) {
      const appResult = applicabilityMap.get(rule.ruleId) || {
        status: 'INSUFFICIENT_DATA',
        reason: 'Rule applicability not evaluated.',
        conditionMetDescription: 'Unknown',
      };

      const progress = progressMap.get(rule.testId) || {
        isCompleted: false,
        isInProgress: false,
        compliance: 'NOT_EVALUATED',
      };

      let executionStatus: SmartTestState = 'NOT_STARTED';
      const blockingReasons: string[] = [];

      // Check if item was explicitly skipped in session.testPlan
      const isSkippedInPlan = session?.testPlan?.some(
        (tp) => (tp.category === rule.testCategory || tp.name === rule.testName) && tp.status === 'SKIPPED'
      );

      // Check applicability barriers
      if (isSkippedInPlan && !rule.isMandatory) {
        executionStatus = 'NOT_APPLICABLE';
      } else if (appResult.status === 'NOT_APPLICABLE') {
        executionStatus = 'NOT_APPLICABLE';
      } else if (appResult.status === 'INSUFFICIENT_DATA') {
        executionStatus = 'INSUFFICIENT_DATA';
        if (appResult.missingFields && appResult.missingFields.length > 0) {
          blockingReasons.push(`Missing required fields: ${appResult.missingFields.join(', ')}`);
        }
      } else if (appResult.status === 'UNVERIFIED') {
        executionStatus = 'UNVERIFIED';
        blockingReasons.push('Rule is UNVERIFIED for automated compliance.');
      } else if (progress.isCompleted) {
        executionStatus = 'COMPLETED';
      } else if (progress.isInProgress) {
        executionStatus = 'IN_PROGRESS';
      } else {
        // Evaluate prerequisites
        let isLocked = false;
        let isBlocked = false;

        for (const prereq of rule.prerequisites) {
          const prereqProgress = progressMap.get(prereq.prerequisiteTestId);

          if (!prereqProgress || !prereqProgress.isCompleted) {
            isLocked = true;
            blockingReasons.push(`Requires: ${prereq.prerequisiteName} to be completed first.`);
          } else if (prereq.requirePassingCompliance && prereqProgress.compliance === 'FAIL') {
            isBlocked = true;
            blockingReasons.push(
              `Blocked: Prerequisite '${prereq.prerequisiteName}' failed compliance criteria (${prereq.description}).`
            );
          }
        }

        if (isBlocked) {
          executionStatus = 'BLOCKED';
        } else if (isLocked) {
          executionStatus = 'LOCKED';
        } else {
          executionStatus = 'READY';
        }
      }

      items.push({
        testId: rule.testId,
        testCategory: rule.testCategory,
        testName: rule.testName,
        clauseRef: rule.clauseRef,
        tableRef: rule.tableRef,
        standard: rule.standard,
        edition: rule.edition,
        sequenceOrder: rule.defaultSequenceOrder,

        applicabilityStatus: appResult.status,
        isMandatory: rule.isMandatory,
        applicabilityReason: appResult.reason,
        conditionMetDescription: appResult.conditionMetDescription,
        missingFields: appResult.missingFields?.map(String),

        executionStatus,
        complianceStatus: progress.compliance,
        dependencies: rule.prerequisites,
        blockingReasons: blockingReasons.length > 0 ? blockingReasons : undefined,

        ruleId: rule.ruleId,
        verificationStatus: rule.verificationStatus,
        sourceReference: rule.sourceReference,
        traceabilityNotes: rule.notes,
        workflowTab: rule.workflowTab,
      });
    }

    // 3. Sort deterministically by sequence order
    items.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    return items;
  }
}

export const testDependencyResolver = new TestDependencyResolver();
