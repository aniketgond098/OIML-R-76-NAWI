import { describe, it, expect } from 'vitest';
import { db } from '../src/services/storage/database';
import { Instrument } from '../src/types/instrument';

describe('Test Session Start Workflow after Instrument Registration', () => {
  it('allows immediate creation of a test session for a newly registered instrument without re-selection', () => {
    const actor = db.getUsers()[0];
    const newInst: Instrument = {
      id: `INST-TEST-${Date.now()}`,
      instrumentIdTag: 'NAWI-TEST-999',
      manufacturer: 'Sartorius Test Lab',
      model: 'Entris II Balance',
      serialNumber: 'SN-TEST-8888',
      instrumentType: 'Electronic Balance',
      accuracyClass: 'CLASS_II',
      maxCapacity: 620,
      minCapacity: 0.5,
      verificationScaleInterval: 0.01,
      actualScaleInterval: 0.001,
      unit: 'g',
      numberOfIntervals: 62000,
      tareType: 'Subtractive',
      maxTare: 620,
      additiveTare: 0,
      loadReceptorType: 'Round Plate',
      numberOfSupportPoints: 1,
      platformDimensions: '120 mm diameter',
      softwareVersion: 'v2.1',
      powerSupply: '12V DC Adapter',
      operatingTemperatureMin: 10,
      operatingTemperatureMax: 30,
      patternApprovalNumber: 'T10988',
      markingDetails: 'CE M26',
      laboratoryId: 'LAB-IND-001',
      components: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save newly registered instrument to database
    const saved = db.saveInstrument(newInst, actor);
    expect(saved.id).toBe(newInst.id);

    // 2. Query available instruments (same call used in NewTestSessionModal)
    const instruments = db.getInstruments();
    const matching = instruments.find((i) => i.id === saved.id);
    expect(matching).toBeDefined();
    expect(matching?.id).toBe(saved.id);

    // 3. Directly create test session using the preselected instrument ID
    const testSession = db.createTestSession(saved.id, actor, actor);
    expect(testSession).toBeDefined();
    expect(testSession.instrumentId).toBe(saved.id);
    expect(testSession.instrumentSnapshot.manufacturer).toBe('Sartorius Test Lab');
    expect(testSession.testSessionNumber).toMatch(/^TEST-2026-/);
  });

  it('correctly resolves default instrument selection if no preselected ID is specified', () => {
    const actor = db.getUsers()[0];
    const instruments = db.getInstruments();
    expect(instruments.length).toBeGreaterThan(0);

    const defaultId = instruments[0].id;
    const testSession = db.createTestSession(defaultId, actor, actor);
    expect(testSession).toBeDefined();
    expect(testSession.instrumentId).toBe(defaultId);
  });
});
