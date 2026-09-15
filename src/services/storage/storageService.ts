import { Instrument } from '../../types/instrument';
import { TestSession } from '../../types/testSession';
import { TestReport, ReportRevision, Attachment } from '../../types/report';
import { TestEquipment } from '../../types/equipment';
import { Laboratory, UserProfile } from '../../types/user';
import { AuditLogEntry, AuditActionType } from '../../types/audit';
import { StorageStatusState, SyncQueueItem } from '../../types/storage';
import { indexedDBService } from './indexedDB';
import { supabaseService, isSupabaseConfigured } from './supabase';
import { syncEngine } from './syncEngine';
import { migrationService } from './migrationService';
import { SEED_EQUIPMENT, SEED_INSTRUMENTS, SEED_LABORATORY, SEED_USERS } from './seedData';
import { evaluateOverallTestSessionCompliance, generateTestPlanForInstrument } from '../../metrology/compliance/complianceEngine';
import { testSequencingEngine } from '../../metrology/sequencing/testSequencingEngine';
import { generateTestReport } from '../../metrology/compliance/reportGenerator';
import { calculateWeighingError } from '../../metrology/calculations/weighing';
import { calculateRepeatability } from '../../metrology/calculations/repeatability';
import { calculateEccentricityPosition } from '../../metrology/calculations/eccentricity';
import { calculateZeroSetting } from '../../metrology/calculations/zeroSetting';
import { calculateTare } from '../../metrology/calculations/tare';
import { ruleEngine } from '../../metrology/rules/ruleEngine';

export async function calculateSha256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash-${Math.abs(hash).toString(16)}`;
}

export class StorageService {
  private instruments: Map<string, Instrument> = new Map();
  private testSessions: Map<string, TestSession> = new Map();
  private reports: Map<string, TestReport> = new Map();
  private equipment: Map<string, TestEquipment> = new Map();
  private laboratories: Map<string, Laboratory> = new Map();
  private users: Map<string, UserProfile> = new Map();
  private attachments: Map<string, Attachment> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  private reportCounter = 1;
  private testCounter = 1;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init();
  }

  public async initialize(): Promise<void> {
    return this.init();
  }

  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Step 0: In non-browser (Node/Vitest) environment where indexedDB is unavailable
        if (typeof indexedDB === 'undefined') {
          SEED_INSTRUMENTS.forEach((inst) => this.instruments.set(inst.id, inst));
          SEED_USERS.forEach((u) => this.users.set(u.id, u));
          SEED_EQUIPMENT.forEach((eq) => this.equipment.set(eq.id, eq));
          this.laboratories.set(SEED_LABORATORY.id, SEED_LABORATORY);
          await this.seedInitialData();
          this.isInitialized = true;
          return;
        }

        // Step 1: Run migration check from legacy localStorage to IndexedDB
        await migrationService.checkAndRunMigration();

        // Step 2: Load all stores from IndexedDB into memory
        const [insts, sesss, rpts, eqs, labs, usrs, atts, logs, counters] = await Promise.all([
          indexedDBService.getAll<Instrument>('instruments'),
          indexedDBService.getAll<TestSession>('testSessions'),
          indexedDBService.getAll<TestReport>('reports'),
          indexedDBService.getAll<TestEquipment>('equipment'),
          indexedDBService.getAll<Laboratory>('laboratories'),
          indexedDBService.getAll<UserProfile>('users'),
          indexedDBService.getAll<Attachment>('attachments'),
          indexedDBService.getAll<AuditLogEntry>('auditLogs'),
          indexedDBService.getMetadata<{ reportCounter: number; testCounter: number }>('counters'),
        ]);

        insts.forEach((x) => this.instruments.set(x.id, x));
        sesss.forEach((x) => this.testSessions.set(x.id, x));
        rpts.forEach((x) => this.reports.set(x.id, x));
        eqs.forEach((x) => this.equipment.set(x.id, x));
        labs.forEach((x) => this.laboratories.set(x.id, x));
        usrs.forEach((x) => this.users.set(x.id, x));
        atts.forEach((x) => this.attachments.set(x.id, x));
        this.auditLogs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (counters) {
          this.reportCounter = counters.reportCounter || 1;
          this.testCounter = counters.testCounter || 1;
        }

        // Step 3: If IndexedDB was brand new and empty, seed initial data
        if (this.instruments.size === 0) {
          await this.seedInitialData();
        }

        this.isInitialized = true;
        console.log('[StorageService] Local IndexedDB loaded successfully:', {
          instruments: this.instruments.size,
          testSessions: this.testSessions.size,
          reports: this.reports.size,
          equipment: this.equipment.size,
          auditLogs: this.auditLogs.length,
        });

        // Step 4: If Supabase is configured and online, check for cloud sync
        if (isSupabaseConfigured()) {
          syncEngine.checkConnectivityAndSync();
        }
      } catch (err) {
        console.error('[StorageService] Initialization error:', err);
      }
    })();

    return this.initPromise;
  }

  private async persistCounters() {
    await indexedDBService.setMetadata('counters', {
      reportCounter: this.reportCounter,
      testCounter: this.testCounter,
    });
  }

  private queueSync(entityType: any, entityId: string, operationType: any, payload: any) {
    const queueItem: SyncQueueItem = {
      id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      entityType,
      entityId,
      operationType,
      payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
      deviceId: syncEngine.getDeviceId(),
    };

    // Save to IndexedDB syncQueue
    indexedDBService.enqueueSync(queueItem).then(() => {
      // Trigger background sync if online
      syncEngine.triggerSync();
    }).catch((err) => {
      console.warn('[StorageService] Failed to enqueue sync item:', err);
    });
  }

  private async seedInitialData() {
    this.laboratories.set(SEED_LABORATORY.id, SEED_LABORATORY);
    SEED_USERS.forEach((u) => this.users.set(u.id, u));
    SEED_EQUIPMENT.forEach((eq) => this.equipment.set(eq.id, eq));
    SEED_INSTRUMENTS.forEach((inst) => this.instruments.set(inst.id, inst));

    if (typeof indexedDB !== 'undefined') {
      await Promise.all([
        indexedDBService.put('laboratories', SEED_LABORATORY),
        indexedDBService.putMany('users', SEED_USERS),
        indexedDBService.putMany('equipment', SEED_EQUIPMENT),
        indexedDBService.putMany('instruments', SEED_INSTRUMENTS),
      ]);
    }

    // Create 1 realistic pre-calculated completed test session and 1 approved report
    const inst = SEED_INSTRUMENTS[1];
    const plan = generateTestPlanForInstrument(inst);

    const sampleWeighing = [
      { load: 0.1, ind: 0.1, dl: 0.0025 },
      { load: 2.5, ind: 2.5, dl: 0.0025 },
      { load: 5.0, ind: 5.0, dl: 0.0024 },
      { load: 10.0, ind: 10.0, dl: 0.0026 },
      { load: 15.0, ind: 15.0, dl: 0.0025 },
      { load: 10.0, ind: 10.0, dl: 0.0025 },
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

    const repReadings1 = [
      { runIndex: 1, zeroIndication: 0, indicatedValue: 7.5 },
      { runIndex: 2, zeroIndication: 0, indicatedValue: 7.5 },
      { runIndex: 3, zeroIndication: 0, indicatedValue: 7.5 },
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

    const eccPoints = [
      { id: 1, name: 'Center', ind: 5.0, dl: 0.0025 },
      { id: 2, name: 'Front-Left', ind: 5.0, dl: 0.0024 },
      { id: 3, name: 'Front-Right', ind: 5.0, dl: 0.0025 },
      { id: 4, name: 'Rear-Left', ind: 5.0, dl: 0.0026 },
      { id: 5, name: 'Rear-Right', ind: 5.0, dl: 0.0025 },
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

    const zeroCalc = calculateZeroSetting({
      zeroIndicationI0: 0,
      turningPointDeltaL0: 0.0025,
      verificationScaleIntervalE: inst.verificationScaleInterval,
      unit: inst.unit,
      maxCapacity: inst.maxCapacity,
      maxZeroRangeLoadApplied: 0.5,
    });

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
      verificationType: 'INITIAL',
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
      discriminationObservation: {
        nominalLoadL: 15.0,
        initialIndicationI1: 15.0,
        actualScaleIntervalD: 0.005,
        extraLoadRequired: 0.007,
        actualExtraLoadApplied: 0.007,
        indicationAfterLoadI2: 15.005,
        indicationChangeDeltaI: 0.005,
        minimumRequiredChange: 0.005,
        compliance: 'PASS',
      },
      tiltingObservation: {
        positions: [
          { tiltDirection: 'TOP', tiltValuePermil: 50, zeroErrorE0: 0, correctedErrorEc: 0.001, differenceFromLevelEc: 0.001, mpeInUnit: 0.0075, compliance: 'PASS' },
          { tiltDirection: 'BOTTOM', tiltValuePermil: 50, zeroErrorE0: 0, correctedErrorEc: 0.001, differenceFromLevelEc: 0.001, mpeInUnit: 0.0075, compliance: 'PASS' },
          { tiltDirection: 'LEFT', tiltValuePermil: 50, zeroErrorE0: 0, correctedErrorEc: 0.000, differenceFromLevelEc: 0.000, mpeInUnit: 0.0075, compliance: 'PASS' },
          { tiltDirection: 'RIGHT', tiltValuePermil: 50, zeroErrorE0: 0, correctedErrorEc: 0.001, differenceFromLevelEc: 0.001, mpeInUnit: 0.0075, compliance: 'PASS' },
        ],
        maxDifferenceFromLevel: 0.001,
        compliance: 'PASS',
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
      isDemoData: true,
    };

    this.testSessions.set(sampleTestSession.id, sampleTestSession);
    if (typeof indexedDB !== 'undefined') {
      await indexedDBService.put('testSessions', sampleTestSession);
    }

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
    if (typeof indexedDB !== 'undefined') {
      await indexedDBService.put('reports', sampleReport);
    }

    this.reportCounter = 2;
    this.testCounter = 2;
    if (typeof indexedDB !== 'undefined') {
      await this.persistCounters();
    }

    // Queue baseline records for cloud sync
    this.queueSync('LABORATORY', SEED_LABORATORY.id, 'CREATE', SEED_LABORATORY);
    SEED_USERS.forEach((u) => this.queueSync('USER', u.id, 'CREATE', u));
    SEED_EQUIPMENT.forEach((eq) => this.queueSync('EQUIPMENT', eq.id, 'CREATE', eq));
    SEED_INSTRUMENTS.forEach((i) => this.queueSync('INSTRUMENT', i.id, 'CREATE', i));
    this.queueSync('TEST_SESSION', sampleTestSession.id, 'CREATE', sampleTestSession);
    this.queueSync('REPORT', sampleReport.id, 'CREATE', sampleReport);
  }

  // --- Instruments API ---
  public getInstruments(): Instrument[] {
    return Array.from(this.instruments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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

    // 1. Update in-memory state for instant UI responsiveness
    this.instruments.set(updated.id, updated);

    // 2. Persist immediately to IndexedDB
    indexedDBService.put('instruments', updated).catch((err) => {
      console.error('[StorageService] Failed to save instrument to IndexedDB:', err);
    });

    // 3. Queue for Supabase synchronization
    this.queueSync('INSTRUMENT', updated.id, isNew ? 'CREATE' : 'UPDATE', updated);

    // 4. Log audit event
    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: isNew ? 'INSTRUMENT_CREATED' : 'INSTRUMENT_UPDATED',
      entityType: 'INSTRUMENT',
      entityId: updated.id,
      entityName: `${updated.manufacturer} ${updated.model} (${updated.serialNumber})`,
      description: isNew
        ? `Registered new instrument ${updated.instrumentIdTag}`
        : `Updated specifications for ${updated.instrumentIdTag}`,
      oldValue: existing,
      newValue: updated,
    });

    return updated;
  }

  public async deleteInstrument(id: string, actor: UserProfile): Promise<void> {
    const existing = this.instruments.get(id);
    if (!existing) return;

    this.instruments.delete(id);
    await indexedDBService.delete('instruments', id);
    this.queueSync('INSTRUMENT', id, 'DELETE', { id });

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'INSTRUMENT_UPDATED',
      entityType: 'INSTRUMENT',
      entityId: id,
      entityName: existing.instrumentIdTag,
      description: `Removed instrument ${existing.instrumentIdTag}`,
      oldValue: existing,
    });
  }

  // --- Test Sessions API ---
  public getTestSessions(): TestSession[] {
    return Array.from(this.testSessions.values())
      .map((s) => {
        const compEval = evaluateOverallTestSessionCompliance(s);
        s.overallCompliance = compEval.overallCompliance;
        s.complianceSummary = compEval.summary;
        return s;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getTestSession(id: string): TestSession | undefined {
    const session = this.testSessions.get(id);
    if (!session) return undefined;
    const compEval = evaluateOverallTestSessionCompliance(session);
    session.overallCompliance = compEval.overallCompliance;
    session.complianceSummary = compEval.summary;
    return session;
  }

  public getTestSessionsForInstrument(instrumentId: string): TestSession[] {
    return Array.from(this.testSessions.values())
      .filter((s) => s.instrumentId === instrumentId)
      .map((s) => {
        const compEval = evaluateOverallTestSessionCompliance(s);
        s.overallCompliance = compEval.overallCompliance;
        s.complianceSummary = compEval.summary;
        return s;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public generateNextTestNumber(): string {
    const year = new Date().getFullYear();
    const numStr = String(this.testCounter).padStart(6, '0');
    this.testCounter++;
    this.persistCounters();
    return `TEST-${year}-${numStr}`;
  }

  public generateNextReportNumber(): string {
    const year = new Date().getFullYear();
    const numStr = String(this.reportCounter).padStart(6, '0');
    this.reportCounter++;
    this.persistCounters();
    return `NAWI-RPT-${year}-${numStr}`;
  }

  public createTestSession(
    instrumentId: string,
    actor: UserProfile,
    technicianUser?: UserProfile
  ): TestSession {
    const inst = this.instruments.get(instrumentId);
    if (!inst) throw new Error('Instrument not found');

    const defaultTech = SEED_USERS.find((u) => u.role === 'LAB_TECHNICIAN') || actor;
    const techToAssign = technicianUser || (actor.role === 'LAB_TECHNICIAN' ? actor : defaultTech);

    const smartPlan = testSequencingEngine.generateSmartTestPlan(inst);
    const testPlan = testSequencingEngine.toLegacyTestPlan(smartPlan);
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
      technicianId: techToAssign.id,
      technicianName: techToAssign.fullName,
      standardEdition: 'OIML R 76-1:2006',
      ruleSetVersion: 'OIML-R76-2006-v1.0',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      testPlan,
      smartTestPlan: smartPlan,
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
      zeroSettingObservation: {
        testType: 'NON_AUTOMATIC_ZERO_SETTING',
        zeroLoad: 0,
        zeroIndication: 0,
        turningPointDeltaL0: 0.5 * inst.actualScaleInterval,
        calculatedZeroErrorE0: 0,
        maxPermissibleZeroError: 0.25 * inst.verificationScaleInterval,
        compliance: 'PASS',
      },
      tareObservation: {
        tareLoadApplied: Number((inst.maxCapacity * 0.3).toFixed(4)),
        indicatedTare: Number((inst.maxCapacity * 0.3).toFixed(4)),
        turningPointDeltaLTare: 0.5 * inst.actualScaleInterval,
        calculatedTareError: 0,
        netTestPoints: [
          {
            nominalNetLoad: Number((inst.maxCapacity * 0.4).toFixed(4)),
            indicatedNet: Number((inst.maxCapacity * 0.4).toFixed(4)),
            turningPointDeltaL: 0.5 * inst.actualScaleInterval,
            correctedNetErrorEc: 0,
            mpeInUnit: inst.verificationScaleInterval,
            compliance: 'PASS',
          },
        ],
        compliance: 'PASS',
      },
      overallCompliance: 'NOT_EVALUATED',
      complianceSummary: {
        totalApplicableTests: testPlan.filter((p) => p.isApplicable).length,
        passedCount: 2,
        failedCount: 0,
        notEvaluatedCount: Math.max(0, testPlan.filter((p) => p.isApplicable).length - 2),
      },
      attachmentIds: [],
    };

    // 1. Update memory
    this.testSessions.set(newSession.id, newSession);

    // 2. Persist immediately to IndexedDB
    indexedDBService.put('testSessions', newSession).catch((err) => {
      console.error('[StorageService] Failed saving new session to IndexedDB:', err);
    });

    // 3. Queue for Supabase
    this.queueSync('TEST_SESSION', newSession.id, 'CREATE', newSession);

    // 4. Audit Log
    this.logAuditEvent({
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

    const compEval = evaluateOverallTestSessionCompliance(session);
    session.overallCompliance = compEval.overallCompliance;
    session.complianceSummary = compEval.summary;

    // Recalculate Smart Test Plan execution state
    if (session.smartTestPlan) {
      session.smartTestPlan = testSequencingEngine.recalculateTestPlanState(session.smartTestPlan, session);
    } else {
      const inst = this.instruments.get(session.instrumentId);
      if (inst) {
        session.smartTestPlan = testSequencingEngine.generateSmartTestPlan(inst, session);
      }
    }

    // 1. Update memory
    this.testSessions.set(session.id, session);

    // 2. Persist immediately to IndexedDB
    indexedDBService.put('testSessions', session).catch((err) => {
      console.error('[StorageService] Failed updating session in IndexedDB:', err);
    });

    // 3. Queue for Supabase
    this.queueSync('TEST_SESSION', session.id, 'UPDATE', session);

    // 4. Audit Log
    this.logAuditEvent({
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

  public saveTestSession(session: TestSession, actor: UserProfile): TestSession {
    return this.updateTestSession(session, actor);
  }

  private sanitizeReportCompliance(report: TestReport): TestReport {
    if (!report) return report;
    const session = report.testSessionSnapshot;
    const inst = report.instrumentSnapshot;

    if (report.complianceMatrix && report.complianceMatrix.length > 0 && session) {
      report.complianceMatrix.forEach((entry) => {
        if (entry.category === 'ZERO_SETTING') {
          if (session.zeroSettingObservation) {
            const z = session.zeroSettingObservation;
            const e0 = Math.abs(z.calculatedZeroErrorE0 || 0);
            const maxZero = z.maxPermissibleZeroError || 0.25 * (inst.verificationScaleInterval || 1);
            const isPass = z.compliance === 'PASS' || e0 <= maxZero + 1e-9;
            entry.compliance = isPass ? 'PASS' : 'FAIL';
            entry.status = 'COMPLETED';
            entry.calculatedError = `E0 = ${e0.toFixed(4)} ${inst.unit}`;
            entry.summaryResult = isPass ? 'PASS (Within 0.25e)' : 'FAIL';
          }
        } else if (entry.category === 'TARE') {
          if (session.tareObservation) {
            const t = session.tareObservation;
            const eTare = Math.abs(t.calculatedTareError || 0);
            const maxTare = 0.25 * (inst.verificationScaleInterval || 1);
            const tarePass = t.compliance === 'PASS' || eTare <= maxTare + 1e-9;
            const netPass =
              !t.netTestPoints ||
              t.netTestPoints.length === 0 ||
              t.netTestPoints.every((pt) => pt.compliance !== 'FAIL');
            const isPass = tarePass && netPass;
            entry.compliance = isPass ? 'PASS' : 'FAIL';
            entry.status = 'COMPLETED';
            entry.calculatedError = `Etare = ${eTare.toFixed(4)} ${inst.unit}`;
            entry.summaryResult = isPass ? 'PASS (Tare & Net compliant)' : 'FAIL';
          }
        } else if (entry.category === 'ECCENTRICITY') {
          if (session.eccentricityObservations && session.eccentricityObservations.length > 0) {
            const hasFail = session.eccentricityObservations.some(
              (o) =>
                o.compliance === 'FAIL' ||
                (o.mpeInUnit !== undefined &&
                  o.correctedErrorEc !== undefined &&
                  Math.abs(o.correctedErrorEc) > o.mpeInUnit + 1e-9)
            );
            const minRequired = Math.max(
              4,
              inst?.numberOfSupportPoints && inst.numberOfSupportPoints <= 4
                ? 4
                : (inst?.numberOfSupportPoints || 4)
            );
            const isCompleted =
              session.eccentricityObservations.length >= minRequired &&
              session.eccentricityObservations.every(
                (o) => o.compliance === 'PASS' && o.indicatedValue !== undefined
              );

            const isPass = !hasFail && isCompleted;
            entry.compliance = hasFail ? 'FAIL' : isPass ? 'PASS' : 'NOT_EVALUATED';
            entry.status = hasFail || isPass ? 'COMPLETED' : 'IN_PROGRESS';
            const passCount = session.eccentricityObservations.filter((o) => o.compliance === 'PASS').length;
            entry.summaryResult = `${passCount}/${session.eccentricityObservations.length} positions passed`;
          }
        } else if (entry.category === 'REPEATABILITY') {
          if (session.repeatabilitySeries && session.repeatabilitySeries.length > 0) {
            const hasFail = session.repeatabilitySeries.some(
              (s) =>
                s.compliance === 'FAIL' ||
                (s.mpeInUnit !== undefined && s.deltaI !== undefined && s.deltaI > s.mpeInUnit + 1e-9)
            );
            const isCompleted = session.repeatabilitySeries.every((s) => s.readings && s.readings.length >= 3);
            entry.compliance = hasFail
              ? 'FAIL'
              : isCompleted && session.repeatabilitySeries.every((s) => s.compliance === 'PASS')
              ? 'PASS'
              : 'NOT_EVALUATED';
            entry.status = hasFail || entry.compliance === 'PASS' ? 'COMPLETED' : 'IN_PROGRESS';
          }
        } else if (entry.category === 'WEIGHING_ACCURACY') {
          if (session.weighingObservations && session.weighingObservations.length > 0) {
            const hasFail = session.weighingObservations.some(
              (o) =>
                o.compliance === 'FAIL' ||
                (o.mpeInUnit !== undefined &&
                  o.correctedErrorEc !== undefined &&
                  Math.abs(o.correctedErrorEc) > o.mpeInUnit + 1e-9)
            );
            const isCompleted =
              session.weighingObservations.length >= 5 &&
              session.weighingObservations.every((o) => o.indicatedValue !== undefined);
            entry.compliance = hasFail
              ? 'FAIL'
              : isCompleted && session.weighingObservations.every((o) => o.compliance === 'PASS')
              ? 'PASS'
              : 'NOT_EVALUATED';
            entry.status = hasFail || entry.compliance === 'PASS' ? 'COMPLETED' : 'IN_PROGRESS';
          }
        }
      });

      const applicable = report.complianceMatrix.filter((e) => e.isApplicable && e.status !== 'SKIPPED');
      if (applicable.some((e) => e.compliance === 'FAIL')) {
        report.overallCompliance = 'FAIL';
        report.complianceStatement = 'NON-COMPLIANT (Tolerance limits exceeded under OIML R 76-1:2006)';
      } else if (applicable.length > 0 && applicable.every((e) => e.compliance === 'PASS')) {
        report.overallCompliance = 'PASS';
        report.complianceStatement = 'COMPLIANT (OIML R 76-1:2006 Table 6 Limits Verified)';
      } else {
        report.overallCompliance = 'NOT_EVALUATED';
        report.complianceStatement = 'INCOMPLETE (Not all applicable tests evaluated)';
      }
    }
    return report;
  }

  // --- Reports API ---
  public getReports(): TestReport[] {
    return Array.from(this.reports.values())
      .map((r) => this.sanitizeReportCompliance(r))
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  public getReport(id: string): TestReport | undefined {
    const report = this.reports.get(id);
    return report ? this.sanitizeReportCompliance(report) : undefined;
  }

  public getReportsForInstrument(instrumentId: string): TestReport[] {
    return Array.from(this.reports.values())
      .filter((r) => r.instrumentId === instrumentId)
      .map((r) => this.sanitizeReportCompliance(r))
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

    if (
      session.technicianId === actor.id &&
      actor.role !== 'ADMIN' &&
      actor.role !== 'REVIEWER_OFFICER'
    ) {
      throw new Error(
        'Metrology workflow violation: Testing Technician cannot self-approve reports without an independent Reviewer signoff.'
      );
    }

    const report = generateTestReport({
      testSession: session,
      laboratory: lab,
      equipmentSnapshots: eqSnapshots,
      reviewer: actor,
      comments,
      isDemoData: !!session.isDemoData,
    });

    session.status = 'REPORT_GENERATED';
    session.reviewerId = actor.id;
    session.reviewerName = actor.fullName;
    session.reviewedAt = new Date().toISOString();
    session.reviewerComments = comments;

    // 1. Memory updates
    this.reports.set(report.id, report);
    this.testSessions.set(session.id, session);

    // 2. Persist to IndexedDB
    await Promise.all([
      indexedDBService.put('reports', report),
      indexedDBService.put('testSessions', session),
    ]);

    // 3. Queue for Supabase
    this.queueSync('REPORT', report.id, 'CREATE', report);
    this.queueSync('TEST_SESSION', session.id, 'UPDATE', session);

    // 4. Audit Log
    this.logAuditEvent({
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
    await indexedDBService.put('reports', report);
    this.queueSync('REPORT', report.id, 'UPDATE', report);

    this.logAuditEvent({
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

  public saveReport(report: TestReport, actor: UserProfile): TestReport {
    this.reports.set(report.id, report);
    indexedDBService.put('reports', report);
    this.queueSync('REPORT', report.id, 'UPDATE', report);

    this.logAuditEvent({
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
    indexedDBService.put('equipment', equipment);
    this.queueSync('EQUIPMENT', equipment.id, isNew ? 'CREATE' : 'UPDATE', equipment);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'EQUIPMENT_CALIBRATION_UPDATED',
      entityType: 'EQUIPMENT',
      entityId: equipment.id,
      entityName: equipment.name,
      description: isNew
        ? `Registered test equipment ${equipment.equipmentIdTag}`
        : `Updated calibration status for ${equipment.equipmentIdTag}`,
      newValue: equipment,
    });

    return equipment;
  }

  // --- Attachments / Photos / Documents API ---
  public getAttachments(): Attachment[] {
    return Array.from(this.attachments.values());
  }

  public getAttachmentsForEntity(entityId: string): Attachment[] {
    return Array.from(this.attachments.values()).filter(
      (a) => a.associatedEntityId === entityId
    );
  }

  public async saveAttachment(attachment: Attachment, actor: UserProfile): Promise<Attachment> {
    this.attachments.set(attachment.id, attachment);
    await indexedDBService.put('attachments', attachment);

    // If associated with a test session, update the session's attachmentIds
    if (attachment.associatedEntity === 'TEST_SESSION') {
      const session = this.testSessions.get(attachment.associatedEntityId);
      if (session) {
        if (!session.attachmentIds) session.attachmentIds = [];
        if (!session.attachmentIds.includes(attachment.id)) {
          session.attachmentIds.push(attachment.id);
          await indexedDBService.put('testSessions', session);
          this.queueSync('TEST_SESSION', session.id, 'UPDATE', session);
        }
      }
    }

    // Queue attachment file upload for Supabase Storage + metadata sync
    this.queueSync('ATTACHMENT', attachment.id, 'CREATE', attachment);

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'ATTACHMENT',
      entityId: attachment.id,
      entityName: attachment.name,
      description: `Uploaded attachment ${attachment.name} for ${attachment.associatedEntity} ${attachment.associatedEntityId}`,
      newValue: { id: attachment.id, name: attachment.name, sizeBytes: attachment.sizeBytes },
    });

    return attachment;
  }

  public async deleteAttachment(id: string, actor: UserProfile): Promise<void> {
    const existing = this.attachments.get(id);
    if (!existing) return;

    this.attachments.delete(id);
    await indexedDBService.delete('attachments', id);
    this.queueSync('ATTACHMENT', id, 'DELETE', { id });

    this.logAuditEvent({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: 'ATTACHMENT_DELETED',
      entityType: 'ATTACHMENT',
      entityId: id,
      entityName: existing.name,
      description: `Deleted attachment ${existing.name}`,
    });
  }

  // --- Audit Logs API ---
  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public logAuditEvent(params: {
    actorId: string;
    actorName: string;
    actorRole: any;
    action: AuditActionType;
    entityType: any;
    entityId: string;
    entityName?: string;
    description: string;
    oldValue?: any;
    newValue?: any;
    reason?: string;
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      description: params.description,
      oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : undefined,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue) : undefined,
      reason: params.reason,
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 5000) {
      this.auditLogs = this.auditLogs.slice(0, 5000);
    }

    // Persist to IndexedDB
    indexedDBService.put('auditLogs', entry).catch((e) => {
      console.warn('[StorageService] Error saving audit log to IndexedDB:', e);
    });

    // Queue for cloud sync
    this.queueSync('AUDIT_LOG', entry.id, 'CREATE', entry);

    return entry;
  }

  public getMetrologyRules() {
    return ruleEngine.getAllRules();
  }

  // --- Users & Laboratories API ---
  public getUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  public getLaboratory(id: string): Laboratory | undefined {
    return this.laboratories.get(id) || SEED_LABORATORY;
  }

  public getLaboratories(): Laboratory[] {
    return Array.from(this.laboratories.values());
  }

  // --- Connectivity & Sync Engine Subscriptions ---
  public getSyncStatus(): StorageStatusState {
    return syncEngine.getStatus();
  }

  public subscribeSyncStatus(listener: (status: StorageStatusState) => void): () => void {
    return syncEngine.subscribe(listener);
  }

  public async triggerSync(): Promise<void> {
    return syncEngine.triggerSync();
  }

  public async retrySync(): Promise<void> {
    return syncEngine.checkConnectivityAndSync();
  }
}

export const storageService = new StorageService();
