import { Instrument } from '../../types/instrument';
import { TestSession } from '../../types/testSession';
import { TestReport, ReportRevision, Attachment } from '../../types/report';
import { TestEquipment } from '../../types/equipment';
import { Laboratory, UserProfile } from '../../types/user';
import { SEED_EQUIPMENT, SEED_INSTRUMENTS, SEED_LABORATORY, SEED_USERS } from './seedData';
import { auditService } from './auditService';
import { generateTestPlanForInstrument } from '../../metrology/compliance/complianceEngine';
import { calculateWeighingError } from '../../metrology/calculations/weighing';
import { calculateRepeatability } from '../../metrology/calculations/repeatability';
import { calculateEccentricityPosition } from '../../metrology/calculations/eccentricity';
import { calculateZeroSetting } from '../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../metrology/calculations/tare';
import { ruleEngine } from '../../metrology/rules/ruleEngine';
import { generateTestReport } from '../../metrology/compliance/reportGenerator';

// LocalStorage Keys
const KEYS = {
  INSTRUMENTS: 'oiml_nawi_instruments_v1',
  TEST_SESSIONS: 'oiml_nawi_test_sessions_v1',
  REPORTS: 'oiml_nawi_reports_v1',
  EQUIPMENT: 'oiml_nawi_equipment_v1',
  LABORATORIES: 'oiml_nawi_laboratories_v1',
  USERS: 'oiml_nawi_users_v1',
  ATTACHMENTS: 'oiml_nawi_attachments_v1',
  COUNTERS: 'oiml_nawi_counters_v1',
};

// SHA-256 calculation utility
export async function calculateSha256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple checksum if crypto.subtle unavailable
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

class MetrologyDatabase {
  private instruments: Map<string, Instrument> = new Map();
  private testSessions: Map<string, TestSession> = new Map();
  private reports: Map<string, TestReport> = new Map();
  private equipment: Map<string, TestEquipment> = new Map();
  private laboratories: Map<string, Laboratory> = new Map();
  private users: Map<string, UserProfile> = new Map();
  private attachments: Map<string, Attachment> = new Map();

  private reportCounter = 1;
  private testCounter = 1;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    this.loadFromStorage();

    // If database is brand new, seed realistic baseline data
    if (this.instruments.size === 0) {
      this.seedInitialData();
    }
  }

  private loadFromStorage() {
    try {
      const load = <T>(key: string): T[] => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
      };

      load<Instrument>(KEYS.INSTRUMENTS).forEach((x) => this.instruments.set(x.id, x));
      load<TestSession>(KEYS.TEST_SESSIONS).forEach((x) => this.testSessions.set(x.id, x));
      load<TestReport>(KEYS.REPORTS).forEach((x) => this.reports.set(x.id, x));
      load<TestEquipment>(KEYS.EQUIPMENT).forEach((x) => this.equipment.set(x.id, x));
      load<Laboratory>(KEYS.LABORATORIES).forEach((x) => this.laboratories.set(x.id, x));
      load<UserProfile>(KEYS.USERS).forEach((x) => this.users.set(x.id, x));
      load<Attachment>(KEYS.ATTACHMENTS).forEach((x) => this.attachments.set(x.id, x));

      const counters = localStorage.getItem(KEYS.COUNTERS);
      if (counters) {
        const parsed = JSON.parse(counters);
        this.reportCounter = parsed.reportCounter || 1;
        this.testCounter = parsed.testCounter || 1;
      }
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(KEYS.INSTRUMENTS, JSON.stringify(Array.from(this.instruments.values())));
      localStorage.setItem(KEYS.TEST_SESSIONS, JSON.stringify(Array.from(this.testSessions.values())));
      localStorage.setItem(KEYS.REPORTS, JSON.stringify(Array.from(this.reports.values())));
      localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(Array.from(this.equipment.values())));
      localStorage.setItem(KEYS.LABORATORIES, JSON.stringify(Array.from(this.laboratories.values())));
      localStorage.setItem(KEYS.USERS, JSON.stringify(Array.from(this.users.values())));
      localStorage.setItem(KEYS.ATTACHMENTS, JSON.stringify(Array.from(this.attachments.values())));
      localStorage.setItem(
        KEYS.COUNTERS,
        JSON.stringify({ reportCounter: this.reportCounter, testCounter: this.testCounter })
      );
    } catch (e) {
      console.error('Failed to persist database to localStorage:', e);
    }
  }

  private seedInitialData() {
    this.laboratories.set(SEED_LABORATORY.id, SEED_LABORATORY);
    SEED_USERS.forEach((u) => this.users.set(u.id, u));
    SEED_EQUIPMENT.forEach((eq) => this.equipment.set(eq.id, eq));
    SEED_INSTRUMENTS.forEach((inst) => this.instruments.set(inst.id, inst));

    // Create 1 realistic pre-calculated completed test session and 1 approved report for Demonstration Traceability
    const inst = SEED_INSTRUMENTS[1]; // Bench scale 15kg, e=5g
    const plan = generateTestPlanForInstrument(inst);

    // Build sample weighing observations
    const sampleWeighing = [
      { load: 0.1, ind: 0.1, dl: 0.0025 }, // Min
      { load: 2.5, ind: 2.5, dl: 0.0025 }, // 500e
      { load: 5.0, ind: 5.0, dl: 0.0024 }, // 1000e
      { load: 10.0, ind: 10.0, dl: 0.0026 }, // 2000e
      { load: 15.0, ind: 15.0, dl: 0.0025 }, // Max
      { load: 10.0, ind: 10.0, dl: 0.0025 }, // Descending
      { load: 5.0, ind: 5.0, dl: 0.0024 },
      { load: 0.1, ind: 0.1, dl: 0.0025 },
    ].map((pt, idx) => {
      const calc = calculateWeighingError({
        nominalLoadL: pt.load,
        indicatedValueI: pt.ind,
        verificationScaleIntervalE: inst.verificationScaleInterval,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
        turningPointDeltaL: pt.dl,
        zeroErrorE0: 0,
      });

      return {
        id: `W-OBS-${idx + 1}`,
        testPointIndex: idx + 1,
        direction: (idx <= 4 ? 'ASCENDING' : 'DESCENDING') as 'ASCENDING' | 'DESCENDING',
        nominalLoad: pt.load,
        indicatedValue: pt.ind,
        turningPointDeltaL: pt.dl,
        calculatedIndicationP: calc.calculatedIndicationP,
        errorPriorToRoundingE: calc.errorPriorToRoundingE,
        zeroErrorE0: 0,
        correctedErrorEc: calc.correctedErrorEc,
        mpeE: calc.mpeE,
        mpeInUnit: calc.mpeInUnit,
        compliance: calc.compliance,
      };
    });

    // Repeatability test at 0.5 Max (7.5 kg) and Max (15 kg)
    const repReadings1 = [
      { runIndex: 1, zeroIndication: 0, indicatedValue: 7.500 },
      { runIndex: 2, zeroIndication: 0, indicatedValue: 7.500 },
      { runIndex: 3, zeroIndication: 0, indicatedValue: 7.500 },
    ];
    const repCalc1 = calculateRepeatability({
      nominalLoadL: 7.5,
      readings: repReadings1,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
    });

    const repSeries = [
      {
        id: 'REP-SER-1',
        seriesNumber: 1,
        nominalLoad: 7.5,
        readings: repReadings1,
        maxIndication: repCalc1.maxIndication,
        minIndication: repCalc1.minIndication,
        deltaI: repCalc1.deltaI,
        mpeInUnit: repCalc1.mpeInUnit,
        compliance: repCalc1.compliance,
        meanIndication: repCalc1.meanIndication,
        stdDeviation: repCalc1.stdDeviation,
      },
    ];

    // Eccentricity test (4 corners + center at 5 kg = 1/3 Max)
    const eccPoints = [
      { id: 1, name: 'Center', ind: 5.000, dl: 0.0025 },
      { id: 2, name: 'Front-Left', ind: 5.000, dl: 0.0024 },
      { id: 3, name: 'Front-Right', ind: 5.000, dl: 0.0025 },
      { id: 4, name: 'Rear-Left', ind: 5.000, dl: 0.0026 },
      { id: 5, name: 'Rear-Right', ind: 5.000, dl: 0.0025 },
    ].map((pt) => {
      const calc = calculateEccentricityPosition({
        positionId: pt.id,
        positionName: pt.name,
        nominalLoadL: 5.0,
        indicatedValueI: pt.ind,
        turningPointDeltaL: pt.dl,
        zeroErrorE0: 0,
        verificationScaleIntervalE: inst.verificationScaleInterval,
        unit: inst.unit,
        accuracyClass: inst.accuracyClass,
      });

      return {
        id: `ECC-OBS-${pt.id}`,
        positionId: pt.id,
        positionName: pt.name,
        nominalLoad: 5.0,
        indicatedValue: pt.ind,
        turningPointDeltaL: pt.dl,
        calculatedIndicationP: calc.calculatedIndicationP,
        errorPriorToRoundingE: calc.errorPriorToRoundingE,
        correctedErrorEc: calc.correctedErrorEc,
        mpeInUnit: calc.mpeInUnit,
        compliance: calc.compliance,
      };
    });

    // Zero setting calculation
    const zeroCalc = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.0025,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      maxCapacity: inst.maxCapacity,
      maxZeroRangeLoadApplied: 0.5,
    });

    // Tare calculation
    const tareCalc = calculateTare({
      tareLoadAppliedT: 5.0,
      indicatedTareI: 5.0,
      turningPointDeltaLTare: 0.0025,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      accuracyClass: inst.accuracyClass,
      netTestPoints: [
        { nominalNetLoad: 5.0, indicatedNet: 5.0, turningPointDeltaL: 0.0025 },
        { nominalNetLoad: 10.0, indicatedNet: 10.0, turningPointDeltaL: 0.0025 },
      ],
    });

    // Update test plan items to COMPLETED / PASS
    plan.forEach((item) => {
      if (item.isApplicable && item.status !== 'SKIPPED') {
        item.status = 'COMPLETED';
        item.compliance = 'PASS';
      }
    });

    const sampleTestSession: TestSession = {
      id: 'TEST-2026-000001',
      testSessionNumber: 'TEST-2026-000001',
      instrumentId: inst.id,
      instrumentSnapshot: {
        manufacturer: inst.manufacturer,
        model: inst.model,
        serialNumber: inst.serialNumber,
        accuracyClass: inst.accuracyClass,
        maxCapacity: inst.maxCapacity,
        minCapacity: inst.minCapacity,
        verificationScaleInterval: inst.verificationScaleInterval,
        actualScaleInterval: inst.actualScaleInterval,
        unit: inst.unit,
        numberOfIntervals: inst.numberOfIntervals,
        numberOfSupportPoints: inst.numberOfSupportPoints,
      },
      laboratoryId: 'LAB-IND-001',
      technicianId: 'USR-TECH-01',
      technicianName: 'Aniket Gond',
      reviewerId: 'USR-REV-01',
      reviewerName: 'Dr. Rajesh Verma',
      standardEdition: 'OIML R 76-1:2006',
      ruleSetVersion: 'OIML-R76-2006-v1.0',
      status: 'REPORT_GENERATED',
      createdAt: '2026-02-12T09:30:00Z',
      startedAt: '2026-02-12T10:00:00Z',
      completedAt: '2026-02-12T12:00:00Z',
      reviewedAt: '2026-02-12T14:30:00Z',
      testPlan: plan,
      equipmentIds: ['EQ-WT-F1-02', 'EQ-ENV-TH-01'],
      environmentalReadings: [
        {
          id: 'ENV-01',
          timestamp: '2026-02-12T10:00:00Z',
          stage: 'START',
          temperatureC: 22.4,
          relativeHumidityPercent: 48.2,
          atmosphericPressureHPa: 1012.8,
        },
        {
          id: 'ENV-02',
          timestamp: '2026-02-12T12:00:00Z',
          stage: 'END',
          temperatureC: 22.8,
          relativeHumidityPercent: 49.0,
          atmosphericPressureHPa: 1012.6,
        },
      ],
      weighingObservations: sampleWeighing,
      repeatabilitySeries: repSeries,
      eccentricityObservations: eccPoints,
      zeroSettingObservation: {
        testType: 'NON_AUTOMATIC_ZERO_SETTING',
        zeroLoad: 0,
        zeroIndication: 0,
        turningPointDeltaL0: 0.0025,
        calculatedZeroErrorE0: zeroCalc.calculatedZeroErrorE0,
        maxPermissibleZeroError: zeroCalc.maxPermissibleZeroError,
        zeroRangePercentMax: zeroCalc.zeroRangePercentMax,
        compliance: zeroCalc.compliance,
      },
      tareObservation: {
        tareLoadApplied: 5.0,
        indicatedTare: 5.0,
        turningPointDeltaLTare: 0.0025,
        calculatedTareError: tareCalc.calculatedTareErrorEtare,
        netTestPoints: tareCalc.evaluatedNetPoints,
        compliance: tareCalc.compliance,
      },
      overallCompliance: 'PASS',
      complianceSummary: {
        totalApplicableTests: 5,
        passedCount: 5,
        failedCount: 0,
        notEvaluatedCount: 0,
        summaryNotes: 'All mandatory test modules satisfied verified OIML R 76-1:2006 requirements.',
      },
      reviewerComments: 'Full metrological verification confirmed. All errors are within Table 6 limits.',
      attachmentIds: [],
    };

    sampleTestSession.isDemoData = true;
    this.testSessions.set(sampleTestSession.id, sampleTestSession);

    // Create Report
    const sampleReport = generateTestReport({
      testSession: sampleTestSession,
      laboratory: SEED_LABORATORY,
      equipmentSnapshots: [SEED_EQUIPMENT[1], SEED_EQUIPMENT[3]],
      reviewer: SEED_USERS[1],
      comments: 'Full metrological verification confirmed. All errors are within Table 6 limits.',
      isDemoData: true,
    });
    sampleReport.id = 'RPT-2026-000001';
    sampleReport.reportNumber = 'NAWI-RPT-2026-000001';

    this.reports.set(sampleReport.id, sampleReport);
    this.reportCounter = 2;
    this.testCounter = 2;

    this.persist();
  }

  // --- Instruments API ---
  public getInstruments(): Instrument[] {
    return Array.from(this.instruments.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getInstrument(id: string): Instrument | undefined {
    return this.instruments.get(id);
  }

  public saveInstrument(instrument: Instrument, actor: UserProfile): Instrument {
    const isNew = !this.instruments.has(instrument.id);
    const existing = this.instruments.get(instrument.id);

    const updated: Instrument = {
      ...instrument,
      updatedAt: new Date().toISOString(),
    };

    this.instruments.set(updated.id, updated);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: isNew ? 'INSTRUMENT_CREATED' : 'INSTRUMENT_UPDATED',
      entityType: 'INSTRUMENT',
      entityId: updated.id,
      entityName: `${updated.manufacturer} ${updated.model} (${updated.serialNumber})`,
      description: isNew ? `Registered new instrument ${updated.instrumentIdTag}` : `Updated specifications for ${updated.instrumentIdTag}`,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  // --- Test Sessions API ---
  public getTestSessions(): TestSession[] {
    return Array.from(this.testSessions.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTestSession(id: string): TestSession | undefined {
    return this.testSessions.get(id);
  }

  public getTestSessionsForInstrument(instrumentId: string): TestSession[] {
    return Array.from(this.testSessions.values())
      .filter((s) => s.instrumentId === instrumentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public generateNextTestNumber(): string {
    const year = new Date().getFullYear();
    const numStr = String(this.testCounter).padStart(6, '0');
    this.testCounter++;
    this.persist();
    return `TEST-${year}-${numStr}`;
  }

  public generateNextReportNumber(): string {
    const year = new Date().getFullYear();
    const numStr = String(this.reportCounter).padStart(6, '0');
    this.reportCounter++;
    this.persist();
    return `NAWI-RPT-${year}-${numStr}`;
  }

  public createTestSession(instrumentId: string, actor: UserProfile): TestSession {
    const inst = this.instruments.get(instrumentId);
    if (!inst) throw new Error('Instrument not found');

    const testPlan = generateTestPlanForInstrument(inst);
    const testSessionNumber = this.generateNextTestNumber();

    const newSession: TestSession = {
      id: testSessionNumber,
      testSessionNumber,
      instrumentId: inst.id,
      instrumentSnapshot: {
        manufacturer: inst.manufacturer,
        model: inst.model,
        serialNumber: inst.serialNumber,
        accuracyClass: inst.accuracyClass,
        maxCapacity: inst.maxCapacity,
        minCapacity: inst.minCapacity,
        verificationScaleInterval: inst.verificationScaleInterval,
        actualScaleInterval: inst.actualScaleInterval,
        unit: inst.unit,
        numberOfIntervals: inst.numberOfIntervals,
        numberOfSupportPoints: inst.numberOfSupportPoints,
      },
      laboratoryId: inst.laboratoryId || 'LAB-IND-001',
      technicianId: actor.id,
      technicianName: actor.fullName,
      standardEdition: 'OIML R 76-1:2006',
      ruleSetVersion: 'OIML-R76-2006-v1.0',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      testPlan,
      equipmentIds: [],
      environmentalReadings: [
        {
          id: `ENV-${Date.now()}`,
          timestamp: new Date().toISOString(),
          stage: 'START',
          temperatureC: 22.0,
          relativeHumidityPercent: 50.0,
          atmosphericPressureHPa: 1013.25,
        },
      ],
      weighingObservations: [],
      repeatabilitySeries: [],
      eccentricityObservations: [],
      overallCompliance: 'NOT_EVALUATED',
      complianceSummary: {
        totalApplicableTests: testPlan.filter((p) => p.isApplicable).length,
        passedCount: 0,
        failedCount: 0,
        notEvaluatedCount: testPlan.filter((p) => p.isApplicable).length,
      },
      attachmentIds: [],
    };

    this.testSessions.set(newSession.id, newSession);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'TEST_SESSION_CREATED',
      entityType: 'TEST_SESSION',
      entityId: newSession.id,
      entityName: `${newSession.testSessionNumber} for ${inst.instrumentIdTag}`,
      description: `Created test session for ${inst.manufacturer} ${inst.model}`,
      newValue: newSession,
    });

    return newSession;
  }

  public updateTestSession(session: TestSession, actor: UserProfile, reason?: string): TestSession {
    const existing = this.testSessions.get(session.id);
    if (!existing) throw new Error('Test session not found');

    this.testSessions.set(session.id, session);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: session.status !== existing.status ? 'TEST_SUBMITTED_FOR_REVIEW' : 'OBSERVATION_MODIFIED',
      entityType: 'TEST_SESSION',
      entityId: session.id,
      entityName: session.testSessionNumber,
      description: `Updated test session (${session.status})`,
      oldValue: existing,
      newValue: session,
      reason,
    });

    return session;
  }

  // --- Reports API ---
  public getReports(): TestReport[] {
    return Array.from(this.reports.values()).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  public getReport(id: string): TestReport | undefined {
    return this.reports.get(id);
  }

  public getReportsForInstrument(instrumentId: string): TestReport[] {
    return Array.from(this.reports.values())
      .filter((r) => r.instrumentId === instrumentId)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  public async finalizeAndGenerateReport(
    testSessionId: string,
    actor: UserProfile,
    comments?: string
  ): Promise<TestReport> {
    const session = this.testSessions.get(testSessionId);
    if (!session) throw new Error('Test session not found');

    const lab = this.laboratories.get(session.laboratoryId) || this.laboratories.values().next().value;
    if (!lab) throw new Error('Laboratory profile not found');

    const eqSnapshots: TestEquipment[] = session.equipmentIds
      .map((id) => this.equipment.get(id))
      .filter((eq): eq is TestEquipment => eq !== undefined);

    // Enforce role separation: technician cannot silently approve their own session unless admin/authorized
    if (session.technicianId === actor.id && actor.role !== 'ADMIN' && actor.role !== 'REVIEWER_OFFICER') {
      throw new Error('Metrology workflow violation: Testing Technician cannot self-approve reports without an independent Reviewer signoff.');
    }

    const report = generateTestReport({
      testSession: session,
      laboratory: lab,
      equipmentSnapshots: eqSnapshots,
      reviewer: actor,
      comments,
      isDemoData: !!session.isDemoData,
    });

    // Update test session status to REPORT_GENERATED
    session.status = 'REPORT_GENERATED';
    session.reviewerId = actor.id;
    session.reviewerName = actor.fullName;
    session.reviewedAt = new Date().toISOString();
    session.reviewerComments = comments;

    this.reports.set(report.id, report);
    this.testSessions.set(session.id, session);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'REPORT_GENERATED',
      entityType: 'REPORT',
      entityId: report.id,
      entityName: report.reportNumber,
      description: `Generated and digitally sealed verification report (${report.overallCompliance})`,
      newValue: report,
    });

    return report;
  }

  public async createReportRevision(
    reportId: string,
    actor: UserProfile,
    reason: string
  ): Promise<TestReport> {
    const report = this.reports.get(reportId);
    if (!report) throw new Error('Report not found');

    const nextRev = report.currentRevision + 1;
    const snapshotStr = JSON.stringify(report);
    const newHash = await calculateSha256(snapshotStr + `::rev::${nextRev}`);

    const newRevision: ReportRevision = {
      revisionNumber: nextRev,
      createdAt: new Date().toISOString(),
      createdBy: actor.id,
      createdByName: actor.fullName,
      reasonForRevision: reason,
      reportSnapshotData: snapshotStr,
      sha256Hash: newHash,
      approvedBy: actor.fullName,
      approvedAt: new Date().toISOString(),
    };

    report.currentRevision = nextRev;
    report.revisions.push(newRevision);
    report.sha256IntegrityHash = newHash;

    this.reports.set(report.id, report);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'REPORT_REVISION_CREATED',
      entityType: 'REPORT',
      entityId: report.id,
      entityName: `${report.reportNumber} (Rev ${nextRev})`,
      description: `Created revision ${nextRev} for report ${report.reportNumber}`,
      reason,
    });

    return report;
  }

  // --- Equipment API ---
  public getEquipment(): TestEquipment[] {
    return Array.from(this.equipment.values());
  }

  public getEquipmentList(): TestEquipment[] {
    return Array.from(this.equipment.values());
  }

  public saveEquipment(equipment: TestEquipment, actor: UserProfile): TestEquipment {
    const isNew = !this.equipment.has(equipment.id);
    this.equipment.set(equipment.id, equipment);
    this.persist();

    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'EQUIPMENT_CALIBRATION_UPDATED',
      entityType: 'EQUIPMENT',
      entityId: equipment.id,
      entityName: equipment.name,
      description: isNew ? `Registered test equipment ${equipment.equipmentIdTag}` : `Updated calibration status for ${equipment.equipmentIdTag}`,
      newValue: equipment,
    });

    return equipment;
  }

  // --- Audit Logs & Rules API ---
  public getAuditLogs() {
    return auditService.getLogs();
  }

  public getMetrologyRules() {
    return ruleEngine.getAllRules();
  }

  public saveTestSession(session: TestSession, actor: UserProfile): TestSession {
    return this.updateTestSession(session, actor);
  }

  public saveReport(report: TestReport, actor: UserProfile): TestReport {
    this.reports.set(report.id, report);
    this.persist();
    auditService.logEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'REPORT_GENERATED',
      entityType: 'REPORT',
      entityId: report.id,
      entityName: report.reportNumber,
      description: `Saved test report ${report.reportNumber}`,
      newValue: report,
    });
    return report;
  }

  // --- Users & Laboratories API ---
  public getUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  public getLaboratory(id: string): Laboratory | undefined {
    return this.laboratories.get(id) || SEED_LABORATORY;
  }
}

export const db = new MetrologyDatabase();
