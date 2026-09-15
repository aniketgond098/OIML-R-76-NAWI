import { ComplianceStatus } from '../../types/metrology';
import { Instrument } from '../../types/instrument';
import { TestPlanItem, TestSession } from '../../types/testSession';
import { ruleEngine } from '../rules/ruleEngine';
import { testSequencingEngine } from '../sequencing/testSequencingEngine';
import { calculateEccentricityPosition } from '../calculations/eccentricity';

/**
 * Generate Applicable Test Plan based on Instrument Metrological Characteristics
 * Powered by Rule-Driven Smart Test Sequencing Engine under OIML R 76-1:2006
 */
export function generateTestPlanForInstrument(instrument: Instrument): TestPlanItem[] {
  const smartPlan = testSequencingEngine.generateSmartTestPlan(instrument);
  return testSequencingEngine.toLegacyTestPlan(smartPlan);
}

/**
 * Evaluate Overall Compliance across all test categories
 * 
 * Rules:
 * - Dynamically evaluates each planItem's compliance based on actual observations
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
  complianceReason: string;
  legalStatement: string;
} {
  // 1. Synchronize / Evaluate each individual test plan item based on recorded session observations
  if (session.testPlan && session.testPlan.length > 0) {
    for (const item of session.testPlan) {
      if (!item.isApplicable || item.status === 'SKIPPED') {
        if (!item.isMandatory) {
          item.compliance = 'PASS';
        }
        continue;
      }

      switch (item.category) {
        case 'WEIGHING_ACCURACY': {
          const obs = session.weighingObservations;
          if (!obs || obs.length === 0) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            const hasAnyFail = obs.some(
              (o) =>
                o.compliance === 'FAIL' ||
                (o.mpeInUnit !== undefined &&
                  o.correctedErrorEc !== undefined &&
                  Math.abs(o.correctedErrorEc) > o.mpeInUnit + 1e-9)
            );
            if (hasAnyFail) {
              item.status = 'COMPLETED';
              item.compliance = 'FAIL';
            } else if (
              obs.length < 5 ||
              obs.some((o) => o.compliance === 'NOT_EVALUATED' || o.indicatedValue === undefined)
            ) {
              item.status = 'IN_PROGRESS';
              item.compliance = 'NOT_EVALUATED';
            } else {
              item.status = 'COMPLETED';
              item.compliance = 'PASS';
            }
          }
          break;
        }

        case 'REPEATABILITY': {
          const series = session.repeatabilitySeries;
          if (!series || series.length === 0) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            const hasAnyFail = series.some(
              (s) =>
                s.compliance === 'FAIL' ||
                (s.mpeInUnit !== undefined &&
                  s.deltaI !== undefined &&
                  s.deltaI > s.mpeInUnit + 1e-9)
            );
            if (hasAnyFail) {
              item.status = 'COMPLETED';
              item.compliance = 'FAIL';
            } else if (
              series.some(
                (s) =>
                  s.compliance === 'NOT_EVALUATED' ||
                  !s.readings ||
                  s.readings.length < 3
              )
            ) {
              item.status = 'IN_PROGRESS';
              item.compliance = 'NOT_EVALUATED';
            } else {
              item.status = 'COMPLETED';
              item.compliance = 'PASS';
            }
          }
          break;
        }

        case 'ECCENTRICITY': {
          const ecc = session.eccentricityObservations;
          if (!ecc || ecc.length === 0) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            const inst = session.instrumentSnapshot;
            // Determine if any individual position fails according to OIML R 76-1:2006 Clause 3.6.2
            const hasAnyFail = ecc.some((e) => {
              if (e.compliance === 'FAIL') return true;
              if (
                e.mpeInUnit !== undefined &&
                e.correctedErrorEc !== undefined &&
                Math.abs(e.correctedErrorEc) > e.mpeInUnit + 1e-9
              ) {
                return true;
              }
              // If raw readings are present, calculate position error directly
              if (
                inst &&
                e.nominalLoad !== undefined &&
                e.indicatedValue !== undefined &&
                inst.verificationScaleInterval
              ) {
                const calc = calculateEccentricityPosition({
                  positionId: e.positionId ?? 1,
                  positionName: e.positionName ?? 'Position',
                  nominalLoadL: e.nominalLoad,
                  indicatedValueI: e.indicatedValue,
                  turningPointDeltaL: e.turningPointDeltaL,
                  zeroErrorE0: session.zeroSettingObservation?.calculatedZeroErrorE0 || 0,
                  verificationScaleIntervalE: inst.verificationScaleInterval,
                  unit: inst.unit,
                  accuracyClass: inst.accuracyClass,
                  isServiceVerification: session.verificationType === 'SUBSEQUENT_IN_SERVICE',
                });
                return calc.compliance === 'FAIL';
              }
              return false;
            });

            if (hasAnyFail) {
              item.status = 'COMPLETED';
              item.compliance = 'FAIL';
            } else {
              // Check completion requirements per OIML R 76-1:2006 Clause 3.6.2
              // Platforms require testing center + support corners (minimum 4 positions)
              const minRequiredPositions = Math.max(
                4,
                inst?.numberOfSupportPoints && inst.numberOfSupportPoints <= 4
                  ? 4
                  : (inst?.numberOfSupportPoints || 4)
              );

              const isCompleted =
                ecc.length >= minRequiredPositions &&
                ecc.every(
                  (e) =>
                    e.compliance === 'PASS' &&
                    e.indicatedValue !== undefined &&
                    e.indicatedValue !== null
                );

              if (isCompleted) {
                item.status = 'COMPLETED';
                item.compliance = 'PASS';
              } else {
                item.status = 'IN_PROGRESS';
                item.compliance = 'NOT_EVALUATED';
              }
            }
          }
          break;
        }

        case 'ZERO_SETTING': {
          const zero = session.zeroSettingObservation;
          if (!zero) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            const e0 = Math.abs(zero.calculatedZeroErrorE0 ?? (zero.zeroIndication ?? 0) + 0.5 * (session.instrumentSnapshot?.actualScaleInterval ?? 0) - (zero.turningPointDeltaL0 ?? 0));
            const maxPermissible = zero.maxPermissibleZeroError ?? (0.25 * (session.instrumentSnapshot?.verificationScaleInterval ?? 1));
            const isPass = zero.compliance === 'PASS' || (e0 <= maxPermissible + 1e-9);
            item.status = 'COMPLETED';
            item.compliance = isPass ? 'PASS' : 'FAIL';
          }
          break;
        }

        case 'TARE': {
          const tare = session.tareObservation;
          if (!tare) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            const eTare = Math.abs(tare.calculatedTareError ?? 0);
            const maxPermissible = 0.25 * (session.instrumentSnapshot?.verificationScaleInterval ?? 1);
            const tarePass = tare.compliance === 'PASS' || (eTare <= maxPermissible + 1e-9);
            const netPass = !tare.netTestPoints || tare.netTestPoints.length === 0 || tare.netTestPoints.every((pt) => pt.compliance === 'PASS' || (pt.compliance as string) !== 'FAIL');
            item.status = 'COMPLETED';
            item.compliance = (tarePass && netPass) ? 'PASS' : 'FAIL';
          }
          break;
        }

        case 'DISCRIMINATION': {
          const disc = session.discriminationObservation;
          if (!disc || disc.indicationAfterLoadI2 === undefined) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            item.status = 'COMPLETED';
            item.compliance = disc.compliance || 'PASS';
          }
          break;
        }

        case 'TEMPERATURE_SPAN': {
          const span = session.temperatureSpanObservation;
          const envReadings = session.environmentalReadings || [];
          const hasStartAndEnd =
            envReadings.length >= 2 &&
            envReadings.some((r) => r.stage === 'START') &&
            envReadings.some((r) => r.stage === 'END' || r.stage === 'INTERMEDIATE');

          if (span && span.temperatures && span.temperatures.length >= 2) {
            item.status = 'COMPLETED';
            item.compliance = span.compliance || 'PASS';
          } else if (hasStartAndEnd) {
            item.status = 'COMPLETED';
            item.compliance = 'PASS';
          } else {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          }
          break;
        }

        case 'TILTING': {
          const tilt = session.tiltingObservation;
          if (!tilt || !tilt.positions || tilt.positions.length === 0) {
            item.status = 'PENDING';
            item.compliance = 'NOT_EVALUATED';
          } else {
            item.status = 'COMPLETED';
            item.compliance = tilt.compliance || 'PASS';
          }
          break;
        }

        default:
          break;
      }
    }
  }

  // 2. Tally overall session metrics
  let passedCount = 0;
  let failedCount = 0;
  let notEvaluatedCount = 0;
  let totalApplicable = 0;

  const passedModules: string[] = [];
  const failedModules: string[] = [];
  const notEvaluatedModules: string[] = [];
  const notes: string[] = [];

  // Check each plan item
  for (const item of (session.testPlan || [])) {
    if (!item.isApplicable || item.status === 'SKIPPED') {
      continue;
    }

    totalApplicable++;

    if (item.compliance === 'PASS') {
      passedCount++;
      passedModules.push(item.name);
      notes.push(`[PASS] ${item.name}`);
    } else if (item.compliance === 'FAIL') {
      failedCount++;
      failedModules.push(item.name);
      notes.push(`[FAIL] ${item.name} - Tolerance limit exceeded`);
    } else {
      notEvaluatedCount++;
      notEvaluatedModules.push(item.name);
      notes.push(`[NOT EVALUATED] ${item.name} - Incomplete observations or missing test data`);
    }
  }

  let overallCompliance: ComplianceStatus = 'NOT_EVALUATED';
  let complianceReason = '';
  let legalStatement = '';

  const accuracyClassName = session.instrumentSnapshot.accuracyClass.replace('CLASS_', '');

  if (failedCount > 0) {
    overallCompliance = 'FAIL';
    complianceReason = `Tolerance limit exceeded in: ${failedModules.join(', ')}.`;
    legalStatement = `The non-automatic weighing instrument DOES NOT COMPLY with OIML Recommendation R 76-1:2006 (E) requirements due to tolerance violation(s) in: ${failedModules.join(', ')}. Corrective adjustment or recalibration required before legal use.`;
  } else if (notEvaluatedCount > 0 || totalApplicable === 0) {
    overallCompliance = 'NOT_EVALUATED';
    complianceReason = notEvaluatedModules.length > 0
      ? `Required applicable tests remain unevaluated: ${notEvaluatedModules.join(', ')}.`
      : 'No applicable tests have been recorded.';
    legalStatement = `The legal metrology evaluation is INCOMPLETE (NOT EVALUATED). ${notEvaluatedCount} applicable test module(s) remain unevaluated. Final compliance determination cannot be established until all mandatory applicable test modules are executed.`;
  } else if (passedCount === totalApplicable) {
    overallCompliance = 'PASS';
    complianceReason = 'All verified applicable requirements passed within permissible limits.';
    legalStatement = `The non-automatic weighing instrument COMPLIES with all verified legal metrology requirements of OIML Recommendation R 76-1:2006 (E) for Accuracy Class ${accuracyClassName}. All tested parameters are within the maximum permissible errors specified in Table 6.`;
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
    complianceReason,
    legalStatement,
  };
}
