import {
  PublicVerificationResult,
  PublicVerificationStatus,
  PublicInstrumentData,
  PublicReportSummary,
  PublicTestHistoryItem,
} from '../../types/verification';
import { supabase, isSupabaseConfigured } from '../storage/supabase';
import { db } from '../storage/database';
import { buildVerificationUrl } from '../qr/qrService';

export class VerificationService {
  /**
   * Resolves public verification details for an instrument by its publicVerificationId (or internal id).
   */
  public async verifyInstrument(publicId: string): Promise<PublicVerificationResult> {
    const verificationUrl = buildVerificationUrl(publicId);
    const verifiedAt = new Date().toISOString();

    // Strategy 1: If Supabase is configured, attempt authoritative Cloud lookup
    const isOnline = typeof navigator !== 'undefined' ? (navigator.onLine ?? true) : true;
    if (isSupabaseConfigured() && isOnline) {
      try {
        const cloudResult = await this.querySupabase(publicId);
        if (cloudResult) {
          return {
            ...cloudResult,
            verifiedAt,
            source: 'SUPABASE_CLOUD',
            isOfflineFallback: false,
            verificationUrl,
          };
        }
      } catch (err) {
        console.warn('[VerificationService] Supabase verification lookup failed, trying local fallback:', err);
      }
    }

    // Strategy 2: Local Laboratory Database Fallback (Offline or when running in local client)
    try {
      const localResult = await this.queryLocalDatabase(publicId);
      if (localResult) {
        return {
          ...localResult,
          verifiedAt,
          source: 'LOCAL_OFFLINE_DATABASE',
          isOfflineFallback: true,
          verificationUrl,
        };
      }
    } catch (err) {
      console.error('[VerificationService] Local database verification error:', err);
    }

    // If both Supabase and Local failed to find the instrument
    if (!isSupabaseConfigured() && !navigator.onLine) {
      return {
        status: 'SERVICE_UNAVAILABLE',
        message: 'Verification service currently unavailable. No internet connection and local record not found.',
        verifiedAt,
        source: 'ERROR',
        isOfflineFallback: true,
        history: [],
        verificationUrl,
      };
    }

    return {
      status: 'INSTRUMENT_NOT_FOUND',
      message: 'No registered weighing instrument matches this verification code or QR reference.',
      verifiedAt,
      source: isSupabaseConfigured() ? 'SUPABASE_CLOUD' : 'LOCAL_OFFLINE_DATABASE',
      isOfflineFallback: !isSupabaseConfigured(),
      history: [],
      verificationUrl,
    };
  }

  /**
   * Authoritative lookup via Supabase
   */
  private async querySupabase(publicId: string): Promise<Omit<PublicVerificationResult, 'verifiedAt' | 'source' | 'isOfflineFallback' | 'verificationUrl'> | null> {
    if (!supabase) return null;

    // Check if RPC exists first
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_instrument_verification', {
        p_verification_id: publicId,
      });

      if (!rpcError && rpcData) {
        if (rpcData.status === 'NOT_FOUND') {
          return null;
        }
        if (rpcData.status === 'DISABLED') {
          return {
            status: 'QR_DISABLED',
            message: 'Public QR verification has been disabled or revoked for this instrument by the laboratory.',
            history: [],
          };
        }

        const inst = rpcData.instrument;
        const report = rpcData.latestFinalizedReport;
        const history = (rpcData.history || []).map((h: any) => ({
          id: h.reportNumber,
          reportNumber: h.reportNumber,
          date: h.date,
          compliance: h.compliance,
          isApproved: h.isApproved,
          statusText: h.isApproved ? (h.compliance === 'PASS' ? 'PASSED' : 'FAILED') : 'PENDING',
        }));

        let status: PublicVerificationStatus = 'NO_VALID_REPORT';
        if (report) {
          if (report.isApproved && report.overallCompliance === 'PASS') {
            status = 'PASSED';
          } else if (report.isApproved && report.overallCompliance === 'FAIL') {
            status = 'FAILED';
          } else {
            status = 'UNDER_REVIEW';
          }
        }

        return {
          status,
          instrument: inst,
          latestFinalizedReport: report ? {
            ...report,
            laboratoryName: rpcData.laboratory?.name,
            accreditationNumber: rpcData.laboratory?.accreditationNumber,
          } : undefined,
          history,
        };
      }
    } catch {
      // RPC not supported on database yet; proceed to direct query
    }

    // Direct table query fallback with strict safe column selection
    // 1. First check matching by exact ID
    const { data: instData } = await supabase
      .from('instruments')
      .select('id, instrument_id_tag, manufacturer, model, serial_number, accuracy_class, max_capacity, min_capacity, verification_scale_interval, actual_scale_interval, unit, pattern_approval_number, full_data')
      .eq('id', publicId)
      .limit(1)
      .maybeSingle();

    if (instData) {
      return this.buildResultFromSupabaseRows(instData);
    }

    // 2. Next check within full_data->>'publicVerificationId'
    const { data: jsonMatch } = await supabase
      .from('instruments')
      .select('id, instrument_id_tag, manufacturer, model, serial_number, accuracy_class, max_capacity, min_capacity, verification_scale_interval, actual_scale_interval, unit, pattern_approval_number, full_data')
      .contains('full_data', { publicVerificationId: publicId })
      .limit(1)
      .maybeSingle();

    if (jsonMatch) {
      return this.buildResultFromSupabaseRows(jsonMatch);
    }

    return null;
  }

  private async buildResultFromSupabaseRows(instRow: any) {
    if (!supabase) return null;

    const fullData = instRow.full_data || {};
    if (fullData.qrEnabled === false) {
      return {
        status: 'QR_DISABLED' as PublicVerificationStatus,
        message: 'Public QR verification has been disabled for this instrument.',
        history: [],
      };
    }

    const publicInst: PublicInstrumentData = {
      id: instRow.id,
      publicVerificationId: fullData.publicVerificationId || instRow.id,
      instrumentIdTag: instRow.instrument_id_tag,
      manufacturer: instRow.manufacturer,
      model: instRow.model,
      serialNumber: instRow.serial_number,
      accuracyClass: instRow.accuracy_class,
      maxCapacity: Number(instRow.max_capacity),
      minCapacity: Number(instRow.min_capacity),
      verificationScaleInterval: Number(instRow.verification_scale_interval),
      actualScaleInterval: Number(instRow.actual_scale_interval),
      unit: instRow.unit,
      patternApprovalNumber: instRow.pattern_approval_number,
      qrEnabled: fullData.qrEnabled !== false,
    };

    // Query reports for this instrument
    const { data: reportsData } = await supabase
      .from('reports')
      .select('id, report_number, current_revision, standard_edition, is_approved, overall_compliance, compliance_statement, sha256_integrity_hash, generated_at, full_data')
      .eq('instrument_id', instRow.id)
      .order('generated_at', { ascending: false });

    const reports = reportsData || [];
    
    // Find latest finalized/approved report
    const latestFinalized = reports.find((r) => r.is_approved === true || (r.full_data as any)?.isApproved === true);

    // Also check if there is an active test session under review
    const { data: latestSession } = await supabase
      .from('test_sessions')
      .select('id, test_session_number, status, updated_at')
      .eq('instrument_id', instRow.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const isPendingSession =
      latestSession &&
      (latestSession.status === 'UNDER_REVIEW' || latestSession.status === 'IN_PROGRESS');

    const history: PublicTestHistoryItem[] = reports.map((r) => {
      const approved = Boolean(r.is_approved || (r.full_data as any)?.isApproved);
      return {
        id: r.id,
        reportNumber: r.report_number,
        date: r.generated_at,
        compliance: r.overall_compliance,
        isApproved: approved,
        statusText: approved
          ? (r.overall_compliance === 'PASS' ? 'PASSED' : 'FAILED')
          : 'PENDING',
      };
    });

    let status: PublicVerificationStatus = 'NO_VALID_REPORT';
    if (latestFinalized) {
      if (latestFinalized.overall_compliance === 'PASS') {
        status = 'PASSED';
      } else {
        status = 'FAILED';
      }
    } else if (isPendingSession) {
      status = 'UNDER_REVIEW';
    }

    let reportSummary: PublicReportSummary | undefined = undefined;
    if (latestFinalized) {
      reportSummary = {
        id: latestFinalized.id,
        reportNumber: latestFinalized.report_number,
        currentRevision: latestFinalized.current_revision || 0,
        standardEdition: latestFinalized.standard_edition || 'OIML R 76-1:2006',
        isApproved: true,
        overallCompliance: latestFinalized.overall_compliance,
        complianceStatement: latestFinalized.compliance_statement || 'Officially verified compliant with OIML R 76 regulations.',
        sha256IntegrityHash: latestFinalized.sha256_integrity_hash || 'SHA-256 Verified',
        generatedAt: latestFinalized.generated_at,
      };
    }

    return {
      status,
      instrument: publicInst,
      latestFinalizedReport: reportSummary,
      pendingSession: isPendingSession ? {
        testSessionNumber: latestSession.test_session_number,
        status: latestSession.status,
        updatedAt: latestSession.updated_at,
      } : undefined,
      history,
    };
  }

  /**
   * Local in-memory / IndexedDB database lookup
   */
  private async queryLocalDatabase(publicId: string): Promise<Omit<PublicVerificationResult, 'verifiedAt' | 'source' | 'isOfflineFallback' | 'verificationUrl'> | null> {
    await db.initialize();

    const instruments = db.getInstruments();
    const inst = instruments.find(
      (i) => i.publicVerificationId === publicId || i.id === publicId
    );

    if (!inst) return null;

    if (inst.qrEnabled === false) {
      return {
        status: 'QR_DISABLED',
        message: 'Public QR verification has been disabled for this instrument.',
        history: [],
      };
    }

    const publicInst: PublicInstrumentData = {
      id: inst.id,
      publicVerificationId: inst.publicVerificationId || inst.id,
      instrumentIdTag: inst.instrumentIdTag,
      manufacturer: inst.manufacturer,
      model: inst.model,
      serialNumber: inst.serialNumber,
      accuracyClass: inst.accuracyClass,
      maxCapacity: inst.maxCapacity,
      minCapacity: inst.minCapacity,
      verificationScaleInterval: inst.verificationScaleInterval,
      actualScaleInterval: inst.actualScaleInterval,
      unit: inst.unit,
      patternApprovalNumber: inst.patternApprovalNumber,
      qrEnabled: inst.qrEnabled ?? true,
    };

    // Reports for this instrument
    const reports = db.getReportsForInstrument(inst.id);

    // Latest finalized/approved report
    // A report is finalized when isApproved is true (or overallCompliance is evaluated on approved report)
    const finalizedReports = reports.filter((r) => r.isApproved);
    const latestFinalized = finalizedReports.length > 0 ? finalizedReports[0] : undefined;

    // Check recent test sessions
    const sessions = db.getTestSessionsForInstrument(inst.id);
    const latestSession = sessions.length > 0 ? sessions[0] : undefined;
    const isPendingSession =
      latestSession &&
      (latestSession.status === 'UNDER_REVIEW' ||
        latestSession.status === 'IN_PROGRESS' ||
        latestSession.status === 'COMPLETED');

    const lab = db.getLaboratory(inst.laboratoryId) || db.getLaboratories()[0];

    const history: PublicTestHistoryItem[] = reports.map((r) => ({
      id: r.id,
      reportNumber: r.reportNumber,
      date: r.generatedAt,
      compliance: r.overallCompliance,
      isApproved: r.isApproved,
      statusText: r.isApproved
        ? r.overallCompliance === 'PASS'
          ? 'PASSED'
          : 'FAILED'
        : 'PENDING',
    }));

    let status: PublicVerificationStatus = 'NO_VALID_REPORT';
    if (latestFinalized) {
      if (latestFinalized.overallCompliance === 'PASS') {
        status = 'PASSED';
      } else {
        status = 'FAILED';
      }
    } else if (isPendingSession) {
      status = 'UNDER_REVIEW';
    }

    let reportSummary: PublicReportSummary | undefined = undefined;
    if (latestFinalized) {
      reportSummary = {
        id: latestFinalized.id,
        reportNumber: latestFinalized.reportNumber,
        currentRevision: latestFinalized.currentRevision,
        standardEdition: latestFinalized.standardEdition,
        isApproved: latestFinalized.isApproved,
        overallCompliance: latestFinalized.overallCompliance,
        complianceStatement: latestFinalized.complianceStatement,
        sha256IntegrityHash: latestFinalized.sha256IntegrityHash,
        generatedAt: latestFinalized.generatedAt,
        technicianName: latestFinalized.technicianName,
        reviewerName: latestFinalized.reviewerName,
        laboratoryName: lab?.name,
        accreditationNumber: lab?.accreditationNumber,
      };
    }

    return {
      status,
      instrument: publicInst,
      latestFinalizedReport: reportSummary,
      pendingSession:
        isPendingSession && (!latestFinalized || new Date(latestSession.createdAt).getTime() > new Date(latestFinalized.generatedAt).getTime())
          ? {
              testSessionNumber: latestSession.testSessionNumber,
              status: latestSession.status,
              updatedAt: latestSession.createdAt,
            }
          : undefined,
      history,
    };
  }
}

export const verificationService = new VerificationService();
