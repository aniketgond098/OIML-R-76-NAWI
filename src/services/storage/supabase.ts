import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Instrument } from '../../types/instrument';
import { TestSession } from '../../types/testSession';
import { TestReport, Attachment } from '../../types/report';
import { TestEquipment } from '../../types/equipment';
import { Laboratory, UserProfile } from '../../types/user';
import { AuditLogEntry } from '../../types/audit';
import { indexedDBService } from './indexedDB';

// Read public environment variables safely
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let clientInstance: SupabaseClient | null = null;

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.statusCode || '';
  const msg = (err.message || err.details || String(err)).toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('in the schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

export function isPermissionDeniedError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.statusCode || '';
  const msg = (err.message || err.details || err.hint || String(err)).toLowerCase();
  return (
    code === '42501' ||
    msg.includes('permission denied') ||
    msg.includes('grant the required privileges') ||
    msg.includes('violates row-level security')
  );
}

export function isForeignKeyError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.statusCode || '';
  const msg = (err.message || err.details || err.hint || String(err)).toLowerCase();
  return (
    code === '23503' ||
    msg.includes('violates foreign key constraint') ||
    msg.includes('key is not present in table')
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('[Supabase] Failed to initialize client:', e);
      return null;
    }
  }
  return clientInstance;
}

export class SupabaseService {
  public async checkDatabaseHealth(): Promise<{
    reachable: boolean;
    tablesReady: boolean;
    isSchemaMissing?: boolean;
    isPermissionDenied?: boolean;
    error?: string;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      return { reachable: false, tablesReady: false, error: 'Supabase credentials not configured' };
    }

    try {
      // Light query to verify database reachability and table access
      const { error } = await client.from('laboratories').select('id').limit(1);
      if (error) {
        if (isTableMissingError(error)) {
          return {
            reachable: true,
            tablesReady: false,
            isSchemaMissing: true,
            isPermissionDenied: false,
            error: 'Database tables not found in schema cache (PGRST205). Please run schema.sql in Supabase SQL editor.',
          };
        }
        if (isPermissionDeniedError(error)) {
          return {
            reachable: true,
            tablesReady: false,
            isSchemaMissing: false,
            isPermissionDenied: true,
            error: 'PostgreSQL permission denied (42501). Table access grants needed for anon role. Run GRANT statements in Supabase SQL editor.',
          };
        }
        if (error.code !== 'PGRST116') {
          return { reachable: false, tablesReady: false, error: error.message };
        }
      }
      return { reachable: true, tablesReady: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        return {
          reachable: true,
          tablesReady: false,
          isSchemaMissing: false,
          isPermissionDenied: true,
          error: 'PostgreSQL permission denied (42501). Table access grants needed for anon role.',
        };
      }
      return { reachable: false, tablesReady: false, error: err.message || String(err) };
    }
  }

  public async ping(): Promise<boolean> {
    const health = await this.checkDatabaseHealth();
    return health.reachable && health.tablesReady;
  }

  // --- Entity Dependency Verification & Pre-Provisioning ---

  public async ensureLaboratoryExists(laboratoryId?: string | null): Promise<boolean> {
    if (!laboratoryId) return true;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { data, error } = await client.from('laboratories').select('id').eq('id', laboratoryId).maybeSingle();
      if (!error && data) return true;

      // Check if available in local IndexedDB to auto-provision
      const localLab = await indexedDBService.get<Laboratory>('laboratories', laboratoryId);
      if (localLab) {
        const res = await this.upsertLaboratory(localLab);
        return res.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async ensureInstrumentExists(instrumentId?: string | null): Promise<boolean> {
    if (!instrumentId) return true;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { data, error } = await client.from('instruments').select('id').eq('id', instrumentId).maybeSingle();
      if (!error && data) return true;

      const localInst = await indexedDBService.get<Instrument>('instruments', instrumentId);
      if (localInst) {
        const res = await this.upsertInstrument(localInst);
        return res.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async ensureTestSessionExists(sessionId?: string | null): Promise<boolean> {
    if (!sessionId) return true;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { data, error } = await client.from('test_sessions').select('id').eq('id', sessionId).maybeSingle();
      if (!error && data) return true;

      const localSess = await indexedDBService.get<TestSession>('testSessions', sessionId);
      if (localSess) {
        const res = await this.upsertTestSession(localSess);
        return res.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async ensureUserExists(userId?: string | null): Promise<boolean> {
    if (!userId) return true;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { data, error } = await client.from('users').select('id').eq('id', userId).maybeSingle();
      if (!error && data) return true;

      const localUser = await indexedDBService.get<UserProfile>('users', userId);
      if (localUser) {
        const res = await this.upsertUser(localUser);
        return res.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  // --- Upsert Operations (Idempotent by Primary Key ID) ---

  public async upsertInstrument(instrument: Instrument): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      let labId: string | null = instrument.laboratoryId || null;
      if (labId) {
        const labExists = await this.ensureLaboratoryExists(labId);
        if (!labExists) {
          labId = null;
        }
      }

      const row: Record<string, any> = {
        id: instrument.id,
        instrument_id_tag: instrument.instrumentIdTag,
        manufacturer: instrument.manufacturer,
        model: instrument.model,
        serial_number: instrument.serialNumber,
        instrument_type: instrument.instrumentType,
        accuracy_class: instrument.accuracyClass,
        max_capacity: instrument.maxCapacity,
        min_capacity: instrument.minCapacity,
        verification_scale_interval: instrument.verificationScaleInterval,
        actual_scale_interval: instrument.actualScaleInterval,
        unit: instrument.unit,
        number_of_intervals: instrument.numberOfIntervals,
        tare_type: instrument.tareType || null,
        max_tare: instrument.maxTare || null,
        additive_tare: instrument.additiveTare || null,
        load_receptor_type: instrument.loadReceptorType,
        number_of_support_points: instrument.numberOfSupportPoints,
        platform_dimensions: instrument.platformDimensions || null,
        software_version: instrument.softwareVersion,
        power_supply: instrument.powerSupply,
        operating_temperature_min: instrument.operatingTemperatureMin,
        operating_temperature_max: instrument.operatingTemperatureMax,
        pattern_approval_number: instrument.patternApprovalNumber || null,
        marking_details: instrument.markingDetails || null,
        notes: instrument.notes || null,
        laboratory_id: labId,
        components: instrument.components || [],
        created_at: instrument.createdAt,
        updated_at: instrument.updatedAt,
        full_data: instrument,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('instruments').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isForeignKeyError(error)) {
          // Self-heal: retry without optional foreign key to guarantee record persistence
          row.laboratory_id = null;
          const { error: retryError } = await client.from('instruments').upsert(row, { onConflict: 'id' });
          if (!retryError) return { success: true };
          throw retryError;
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "instruments". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "instruments" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert instrument error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertTestSession(session: TestSession): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      // 1. Ensure instrument exists in Supabase
      if (session.instrumentId) {
        await this.ensureInstrumentExists(session.instrumentId);
      }

      // 2. Ensure optional foreign entities exist or fallback to null
      let labId: string | null = session.laboratoryId || null;
      if (labId) {
        const labExists = await this.ensureLaboratoryExists(labId);
        if (!labExists) labId = null;
      }

      let techId: string | null = session.technicianId || null;
      if (techId) {
        const techExists = await this.ensureUserExists(techId);
        if (!techExists) techId = null;
      }

      let revId: string | null = session.reviewerId || null;
      if (revId) {
        const revExists = await this.ensureUserExists(revId);
        if (!revExists) revId = null;
      }

      const row: Record<string, any> = {
        id: session.id,
        test_session_number: session.testSessionNumber,
        instrument_id: session.instrumentId,
        laboratory_id: labId,
        technician_id: techId,
        technician_name: session.technicianName,
        reviewer_id: revId,
        reviewer_name: session.reviewerName || null,
        standard_edition: session.standardEdition,
        rule_set_version: session.ruleSetVersion,
        status: session.status,
        verification_type: session.verificationType || 'INITIAL',
        is_demo_data: !!session.isDemoData,
        created_at: session.createdAt,
        started_at: session.startedAt || null,
        completed_at: session.completedAt || null,
        reviewed_at: session.reviewedAt || null,
        test_plan: session.testPlan,
        equipment_ids: session.equipmentIds,
        environmental_readings: session.environmentalReadings,
        weighing_observations: session.weighingObservations,
        repeatability_series: session.repeatabilitySeries,
        eccentricity_observations: session.eccentricityObservations,
        zero_setting_observation: session.zeroSettingObservation || null,
        tare_observation: session.tareObservation || null,
        temperature_span_observation: session.temperatureSpanObservation || null,
        discrimination_observation: session.discriminationObservation || null,
        tilting_observation: session.tiltingObservation || null,
        overall_compliance: session.overallCompliance,
        compliance_summary: session.complianceSummary,
        reviewer_comments: session.reviewerComments || null,
        rejection_reason: session.rejectionReason || null,
        attachment_ids: session.attachmentIds || [],
        instrument_snapshot: session.instrumentSnapshot,
        full_data: session,
        updated_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('test_sessions').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isForeignKeyError(error)) {
          // Self-heal: clear optional FKs and ensure instrument then retry
          row.laboratory_id = null;
          row.technician_id = null;
          row.reviewer_id = null;
          await this.ensureInstrumentExists(session.instrumentId);
          const { error: retryError } = await client.from('test_sessions').upsert(row, { onConflict: 'id' });
          if (!retryError) return { success: true };
          throw retryError;
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "test_sessions". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "test_sessions" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert test session error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertReport(report: TestReport): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      // 1. Ensure test session and instrument exist in Supabase
      if (report.testSessionId) {
        await this.ensureTestSessionExists(report.testSessionId);
      }
      if (report.instrumentId) {
        await this.ensureInstrumentExists(report.instrumentId);
      }

      let labId: string | null = report.laboratoryId || null;
      if (labId) {
        const labExists = await this.ensureLaboratoryExists(labId);
        if (!labExists) labId = null;
      }

      const row: Record<string, any> = {
        id: report.id,
        report_number: report.reportNumber,
        current_revision: report.currentRevision,
        test_session_id: report.testSessionId,
        instrument_id: report.instrumentId,
        laboratory_id: labId,
        standard_edition: report.standardEdition,
        rule_set_version: report.ruleSetVersion,
        is_demo_data: !!report.isDemoData,
        instrument_snapshot: report.instrumentSnapshot,
        test_session_snapshot: report.testSessionSnapshot,
        equipment_snapshots: report.equipmentSnapshots,
        compliance_matrix: report.complianceMatrix,
        overall_compliance: report.overallCompliance,
        compliance_reason: report.complianceReason || null,
        compliance_statement: report.complianceStatement,
        technician_name: report.technicianName,
        technician_signed_at: report.technicianSignedAt || null,
        reviewer_name: report.reviewerName,
        reviewer_signed_at: report.reviewerSignedAt || null,
        is_approved: report.isApproved,
        sha256_integrity_hash: report.sha256IntegrityHash,
        generated_at: report.generatedAt,
        revisions: report.revisions || [],
        attachments: report.attachments || [],
        full_data: report,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('reports').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isForeignKeyError(error)) {
          // Self-heal: clear optional lab ID and re-ensure parent entities
          row.laboratory_id = null;
          await this.ensureTestSessionExists(report.testSessionId);
          await this.ensureInstrumentExists(report.instrumentId);
          const { error: retryError } = await client.from('reports').upsert(row, { onConflict: 'id' });
          if (!retryError) return { success: true };
          throw retryError;
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "reports". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "reports" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert report error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertEquipment(equipment: TestEquipment): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      let labId: string | null = equipment.laboratoryId || null;
      if (labId) {
        const labExists = await this.ensureLaboratoryExists(labId);
        if (!labExists) labId = null;
      }

      const row: Record<string, any> = {
        id: equipment.id,
        equipment_id_tag: equipment.equipmentIdTag,
        name: equipment.name,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serial_number: equipment.serialNumber,
        equipment_type: equipment.equipmentType,
        weight_class: equipment.weightClass || null,
        nominal_range: equipment.nominalRange,
        uncertainty: equipment.uncertainty || null,
        calibration_certificate_number: equipment.calibrationCertificateNumber,
        calibrated_by: equipment.calibratedBy,
        calibration_date: equipment.calibrationDate,
        calibration_expiry_date: equipment.calibrationExpiryDate,
        is_expired: equipment.isExpired,
        status: equipment.status,
        notes: equipment.notes || null,
        laboratory_id: labId,
        full_data: equipment,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('equipment').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isForeignKeyError(error)) {
          row.laboratory_id = null;
          const { error: retryError } = await client.from('equipment').upsert(row, { onConflict: 'id' });
          if (!retryError) return { success: true };
          throw retryError;
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "equipment". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "equipment" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert equipment error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertLaboratory(laboratory: Laboratory): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row: Record<string, any> = {
        id: laboratory.id,
        name: laboratory.name,
        legal_address: laboratory.legalAddress,
        city: laboratory.city,
        country: laboratory.country,
        accreditation_number: laboratory.accreditationNumber,
        accreditation_body: laboratory.accreditationBody,
        contact_email: laboratory.contactEmail,
        contact_phone: laboratory.contactPhone,
        logo_url: laboratory.logoUrl || null,
        full_data: laboratory,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('laboratories').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "laboratories". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "laboratories" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert laboratory error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertUser(user: UserProfile): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      let labId: string | null = user.laboratoryId || null;
      if (labId) {
        const labExists = await this.ensureLaboratoryExists(labId);
        if (!labExists) labId = null;
      }

      const row: Record<string, any> = {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        designation: user.designation,
        laboratory_id: labId,
        laboratory_name: user.laboratoryName,
        avatar_url: user.avatarUrl || null,
        signature_text: user.signatureText || null,
        created_at: user.createdAt,
        full_data: user,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('users').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isForeignKeyError(error)) {
          row.laboratory_id = null;
          const { error: retryError } = await client.from('users').upsert(row, { onConflict: 'id' });
          if (!retryError) return { success: true };
          throw retryError;
        }
        throw error;
      }
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "users". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "users" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert user error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  public async upsertAuditLog(entry: AuditLogEntry): Promise<{ success: boolean; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = {
        id: entry.id,
        timestamp: entry.timestamp,
        actor_id: entry.actorId,
        actor_name: entry.actorName,
        actor_role: entry.actorRole,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        entity_name: entry.entityName || null,
        description: entry.description,
        old_value: entry.oldValue || null,
        new_value: entry.newValue || null,
        reason: entry.reason || null,
        ip_address: entry.ipAddress || null,
        synced_at: new Date().toISOString(),
      };

      const { error } = await client.from('audit_logs').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "audit_logs". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "audit_logs" not found in schema cache. Item remains safely preserved in local IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Upsert audit log error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  // --- Attachments & Supabase Storage ---
  public async uploadAttachment(
    attachment: Attachment,
    blobOrDataUrl: Blob | string
  ): Promise<{ success: boolean; storagePath?: string; publicUrl?: string; error?: string; isSchemaMissing?: boolean; isPermissionDenied?: boolean }> {
    const client = getSupabaseClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const bucket = 'nawi-attachments';
      const fileExt = attachment.fileType.split('/')[1] || 'bin';
      const storagePath = `${attachment.associatedEntity.toLowerCase()}s/${attachment.associatedEntityId}/${attachment.id}.${fileExt}`;

      let fileBody: Blob;
      if (typeof blobOrDataUrl === 'string') {
        // Convert Base64 dataUrl to Blob
        const res = await fetch(blobOrDataUrl);
        fileBody = await res.blob();
      } else {
        fileBody = blobOrDataUrl;
      }

      const { error: uploadError } = await client.storage
        .from(bucket)
        .upload(storagePath, fileBody, {
          contentType: attachment.fileType,
          upsert: true,
        });

      if (uploadError) {
        console.warn('[Supabase Storage] File upload error (continuing with metadata):', uploadError.message);
      }

      const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = publicUrlData?.publicUrl || '';

      // Also upsert attachment record in PostgreSQL
      const row = {
        id: attachment.id,
        name: attachment.name,
        file_type: attachment.fileType,
        size_bytes: attachment.sizeBytes,
        storage_path: storagePath,
        public_url: publicUrl,
        uploaded_by: attachment.uploadedBy,
        uploaded_at: attachment.uploadedAt,
        category: attachment.category,
        associated_entity: attachment.associatedEntity,
        associated_entity_id: attachment.associatedEntityId,
        full_data: { ...attachment, dataUrl: publicUrl || attachment.dataUrl },
        synced_at: new Date().toISOString(),
      };

      const { error: dbError } = await client.from('attachments').upsert(row, { onConflict: 'id' });
      if (dbError) throw dbError;

      return { success: true, storagePath, publicUrl };
    } catch (err: any) {
      if (isPermissionDeniedError(err)) {
        console.warn('[Supabase] Permission denied (code 42501) on table "attachments". Item remains safely preserved in local IndexedDB. SQL GRANT command required in Supabase.');
        return { success: false, error: 'PERMISSION_DENIED', isPermissionDenied: true, isSchemaMissing: true };
      }
      if (isTableMissingError(err)) {
        console.warn('[Supabase] Table "attachments" or storage bucket not initialized. Attachment saved locally in IndexedDB.');
        return { success: false, error: 'TABLE_NOT_FOUND', isSchemaMissing: true };
      }
      console.error('[Supabase] Attachment upload error:', err);
      return { success: false, error: err.message || String(err) };
    }
  }

  // --- Batch Fetching (Cloud to Local Sync on Reconnection / Startup) ---

  public async fetchInstruments(): Promise<Instrument[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('instruments').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch instruments failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as Instrument) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchTestSessions(): Promise<TestSession[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('test_sessions').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch test sessions failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as TestSession) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchReports(): Promise<TestReport[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('reports').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch reports failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as TestReport) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchEquipment(): Promise<TestEquipment[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('equipment').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch equipment failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as TestEquipment) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchLaboratories(): Promise<Laboratory[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('laboratories').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch laboratories failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as Laboratory) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchUsers(): Promise<UserProfile[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('users').select('*');
      if (error) {
        if (!isTableMissingError(error) && !isPermissionDeniedError(error)) {
          console.warn('[Supabase] Fetch users failed:', error.message);
        }
        return [];
      }
      return (data || []).map((d: any) => (d.full_data as UserProfile) || d);
    } catch (err) {
      return [];
    }
  }

  public async fetchAuditLogs(): Promise<AuditLogEntry[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (error || !data) return [];
      return data.map((d: any) => {
        if (d.full_data) return d.full_data as AuditLogEntry;
        return {
          id: d.id,
          timestamp: d.timestamp,
          actorId: d.actor_id,
          actorName: d.actor_name,
          actorRole: d.actor_role,
          action: d.action,
          entityType: d.entity_type,
          entityId: d.entity_id,
          entityName: d.entity_name,
          description: d.description,
          oldValue: d.old_value,
          newValue: d.new_value,
          reason: d.reason,
          ipAddress: d.ip_address,
        } as AuditLogEntry;
      });
    } catch (err) {
      console.warn('[Supabase] Fetch audit logs failed:', err);
      return [];
    }
  }
}

export const supabaseService = new SupabaseService();
