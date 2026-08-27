import { AccuracyClass, ComplianceStatus, MassUnit, StandardEdition } from './metrology';

export type TestSessionStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REPORT_GENERATED';

export type TestCategory =
  | 'WEIGHING_ACCURACY'
  | 'REPEATABILITY'
  | 'ECCENTRICITY'
  | 'ZERO_SETTING'
  | 'TARE'
  | 'TEMPERATURE_SPAN'
  | 'DISCRIMINATION'
  | 'TILTING'
  | 'DURABILITY_DISTURBANCE';

export interface EnvironmentalReading {
  id: string;
  timestamp: string;
  stage: 'START' | 'INTERMEDIATE' | 'END';
  temperatureC: number;
  relativeHumidityPercent: number;
  atmosphericPressureHPa?: number;
  technicianNotes?: string;
}

// 1. Weighing Test Observation
export interface WeighingTestObservation {
  id: string;
  testPointIndex: number;
  direction: 'ASCENDING' | 'DESCENDING';
  nominalLoad: number; // L in primary unit
  indicatedValue: number; // I displayed on scale
  turningPointDeltaL?: number; // ΔL extra weight in primary unit (flash point)
  
  // Computed values
  calculatedIndicationP?: number; // P = I + 0.5e - ΔL
  errorPriorToRoundingE?: number; // E = P - L
  zeroErrorE0?: number; // E0 at current stage
  correctedErrorEc?: number; // Ec = E - E0
  mpeE?: number; // MPE in verification scale intervals (e)
  mpeInUnit?: number; // MPE in primary mass unit (e.g. g or kg)
  compliance: ComplianceStatus;
  notes?: string;
}

// 2. Repeatability Test Series
export interface RepeatabilitySeries {
  id: string;
  seriesNumber: number;
  nominalLoad: number; // typically 0.5 Max or Max
  readings: {
    runIndex: number;
    zeroIndication: number; // before load
    indicatedValue: number; // load on pan
    turningPointDeltaL?: number;
    correctedErrorEc?: number;
  }[];
  
  maxIndication: number;
  minIndication: number;
  deltaI: number; // I_max - I_min
  mpeInUnit: number;
  compliance: ComplianceStatus;
  meanIndication?: number;
  stdDeviation?: number;
}

// 3. Eccentricity Test Observation
export interface EccentricityObservation {
  id: string;
  positionId: number; // 1, 2, 3, 4, 5 (Center, Corners/Edges)
  positionName: string; // e.g. "Center", "Front-Left", "Rear-Right"
  nominalLoad: number; // L = Max / 3 or Max / (N - 1)
  indicatedValue: number;
  turningPointDeltaL?: number;
  
  calculatedIndicationP?: number;
  errorPriorToRoundingE?: number;
  correctedErrorEc?: number;
  mpeInUnit?: number;
  compliance: ComplianceStatus;
}

// 4. Zero-Setting Test Observation
export interface ZeroSettingObservation {
  testType: 'INITIAL_ZERO_SETTING' | 'NON_AUTOMATIC_ZERO_SETTING' | 'SEMI_AUTOMATIC_ZERO_SETTING' | 'ZERO_TRACKING';
  zeroLoad: number; // 0
  zeroIndication: number;
  turningPointDeltaL0: number; // extra weight to switch from 0 to 0+e
  calculatedZeroErrorE0: number; // E0 = I0 + 0.5e - ΔL0
  maxPermissibleZeroError: number; // 0.25 e
  zeroRangeMaxApplied?: number; // For range test: max load capable of zeroing
  zeroRangePercentMax?: number; // % of Max (must be <= 4% or <= 20%)
  compliance: ComplianceStatus;
}

// 5. Tare Test Observation
export interface TareObservation {
  tareLoadApplied: number; // T
  indicatedTare: number;
  turningPointDeltaLTare: number;
  calculatedTareError: number; // should be <= 0.25 e
  
  // Net test points
  netTestPoints: {
    nominalNetLoad: number;
    indicatedNet: number;
    turningPointDeltaL?: number;
    correctedNetErrorEc?: number;
    mpeInUnit?: number;
    compliance: ComplianceStatus;
  }[];
  compliance: ComplianceStatus;
}

// 6. Environmental / Temperature Span Test
export interface TemperatureSpanObservation {
  temperatures: {
    tempC: number;
    zeroErrorE0: number;
    spanLoad: number; // e.g. Max
    spanIndication: number;
    spanErrorE: number;
  }[];
  temperatureDifferenceDeltaT: number;
  spanShiftPer5C: number;
  maxPermissibleShiftPer5C: number;
  compliance: ComplianceStatus;
}

// 7. Discrimination Test Observation
export interface DiscriminationObservation {
  nominalLoadL: number;
  initialIndicationI1: number;
  actualScaleIntervalD: number;
  extraLoadRequired: number; // 1.4 * d
  actualExtraLoadApplied: number;
  indicationAfterLoadI2: number;
  indicationChangeDeltaI: number;
  minimumRequiredChange: number; // 1.0 * d
  compliance: ComplianceStatus;
}

// 8. Tilting Test Observation
export interface TiltingObservation {
  positions: {
    tiltDirection: string;
    tiltValuePermil: number;
    zeroErrorE0: number;
    correctedErrorEc: number;
    differenceFromLevelEc: number;
    mpeInUnit: number;
    compliance: ComplianceStatus;
  }[];
  maxDifferenceFromLevel: number;
  compliance: ComplianceStatus;
}

export interface TestPlanItem {
  category: TestCategory;
  name: string;
  clauseRef: string;
  isApplicable: boolean;
  isMandatory: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  compliance: ComplianceStatus;
  reasonForInapplicability?: string;
}

export interface TestSession {
  id: string;
  testSessionNumber: string; // e.g. "TEST-2026-000042"
  instrumentId: string;
  instrumentSnapshot: {
    manufacturer: string;
    model: string;
    serialNumber: string;
    accuracyClass: AccuracyClass;
    maxCapacity: number;
    minCapacity: number;
    verificationScaleInterval: number;
    actualScaleInterval: number;
    unit: MassUnit;
    numberOfIntervals: number;
    numberOfSupportPoints: number;
  };
  laboratoryId: string;
  technicianId: string;
  technicianName: string;
  reviewerId?: string;
  reviewerName?: string;
  
  standardEdition: StandardEdition;
  ruleSetVersion: string; // e.g. "OIML-R76-2006-v1.0"
  status: TestSessionStatus;
  
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  
  // Plan & Equipment
  testPlan: TestPlanItem[];
  equipmentIds: string[];
  
  // Environmental data
  environmentalReadings: EnvironmentalReading[];
  
  // Test observations
  weighingObservations: WeighingTestObservation[];
  repeatabilitySeries: RepeatabilitySeries[];
  eccentricityObservations: EccentricityObservation[];
  zeroSettingObservation?: ZeroSettingObservation;
  tareObservation?: TareObservation;
  temperatureSpanObservation?: TemperatureSpanObservation;
  discriminationObservation?: DiscriminationObservation;
  tiltingObservation?: TiltingObservation;
  
  // Summary & Compliance
  overallCompliance: ComplianceStatus;
  complianceSummary: {
    totalApplicableTests: number;
    passedCount: number;
    failedCount: number;
    notEvaluatedCount: number;
    summaryNotes?: string;
  };
  
  // Reviewer workflow
  rejectionReason?: string;
  reviewerComments?: string;
  
  // Attachments
  attachmentIds: string[];
}
