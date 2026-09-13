import React, { useState, useEffect } from 'react';
import { verificationService } from '../../services/verification/verificationService';
import {
  PublicVerificationResult,
  PublicVerificationStatus,
} from '../../types/verification';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileQuestion,
  ShieldCheck,
  Scale,
  Calendar,
  Building2,
  Hash,
  ShieldAlert,
  ArrowLeft,
  Share2,
  Printer,
  QrCode,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  publicInstrumentId: string;
  onBack?: () => void;
  onScanAnother?: () => void;
  onViewInternalInstrument?: (internalInstrumentId: string) => void;
}

export const PublicVerificationView: React.FC<Props> = ({
  publicInstrumentId,
  onBack,
  onScanAnother,
  onViewInternalInstrument,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const data = await verificationService.verifyInstrument(publicInstrumentId);
      setResult(data);
    } catch (err) {
      console.error('Failed to query public verification:', err);
      setResult({
        status: 'SERVICE_UNAVAILABLE',
        message: 'An unexpected error occurred while communicating with the verification authority.',
        verifiedAt: new Date().toISOString(),
        source: 'ERROR',
        isOfflineFallback: false,
        history: [],
        verificationUrl: window.location.href,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publicInstrumentId) {
      fetchVerification();
    }
  }, [publicInstrumentId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Status visual configurations
  const statusConfig: Record<
    PublicVerificationStatus,
    {
      title: string;
      subtitle: string;
      bg: string;
      border: string;
      text: string;
      badgeBg: string;
      icon: React.ReactNode;
      description: string;
    }
  > = {
    PASSED: {
      title: 'VERIFICATION PASSED',
      subtitle: 'OIML R 76-1:2006 Legal Metrology Compliant',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-700',
      badgeBg: 'bg-emerald-600 text-white',
      icon: <CheckCircle2 size={36} className="text-emerald-600 shrink-0" />,
      description:
        'This Non-Automatic Weighing Instrument has successfully passed official verification against OIML R 76 tolerances and is authorized for legal trade and commercial use.',
    },
    FAILED: {
      title: 'VERIFICATION FAILED',
      subtitle: 'Exceeds Maximum Permissible Error (MPE) Limits',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-700',
      badgeBg: 'bg-rose-600 text-white',
      icon: <XCircle size={36} className="text-rose-600 shrink-0" />,
      description:
        'This instrument failed the latest legal metrology verification tests. It MUST NOT be used for legal trade, commercial transactions, or certified weighing applications.',
    },
    UNDER_REVIEW: {
      title: 'UNDER ACTIVE REVIEW',
      subtitle: 'New Inspection Session Submitted & Pending Sign-Off',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-800',
      badgeBg: 'bg-amber-600 text-white',
      icon: <Clock size={36} className="text-amber-600 shrink-0" />,
      description:
        'A new calibration or verification test session has been conducted and is currently under review by an accredited metrology officer. Prior verification status is superseded until finalized.',
    },
    NO_VALID_REPORT: {
      title: 'NO VALID VERIFICATION ON FILE',
      subtitle: 'Instrument Registered but Not Yet Verified',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-700',
      badgeBg: 'bg-slate-600 text-white',
      icon: <FileQuestion size={36} className="text-slate-600 shrink-0" />,
      description:
        'This weighing instrument is recorded in the metrology system, but no finalized and approved OIML R 76 verification report exists for it yet.',
    },
    QR_DISABLED: {
      title: 'QR VERIFICATION REVOKED',
      subtitle: 'QR Code Disabled by Metrology Authority',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-800',
      badgeBg: 'bg-orange-600 text-white',
      icon: <ShieldAlert size={36} className="text-orange-600 shrink-0" />,
      description:
        'The public QR verification for this instrument has been deactivated by the laboratory administrator. Please contact the metrology authority.',
    },
    INSTRUMENT_NOT_FOUND: {
      title: 'UNRECOGNIZED INSTRUMENT',
      subtitle: 'Identifier Not Found in Registry',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      text: 'text-rose-700',
      badgeBg: 'bg-rose-600 text-white',
      icon: <AlertTriangle size={36} className="text-rose-600 shrink-0" />,
      description:
        'No weighing instrument matching this verification ID or QR code was found in the authoritative metrology registry.',
    },
    SERVICE_UNAVAILABLE: {
      title: 'SERVICE TEMPORARILY UNAVAILABLE',
      subtitle: 'Cannot Connect to Verification Registry',
      bg: 'bg-slate-500/10',
      border: 'border-slate-500/30',
      text: 'text-slate-700',
      badgeBg: 'bg-slate-700 text-white',
      icon: <AlertTriangle size={36} className="text-slate-600 shrink-0" />,
      description:
        'Unable to query the verification registry. Please check your internet connection or try again later.',
    },
  };

  const currentStatus = result ? statusConfig[result.status] : statusConfig.NO_VALID_REPORT;

  return (
    <div
      id="public-verification-view"
      className="min-h-full w-full bg-slate-50 text-slate-900 pb-20 font-sans antialiased"
    >
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Back to Metrology System"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Scale size={18} />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  Legal Metrology Verification
                </h1>
                <p className="text-[10px] text-slate-500 font-mono">
                  OIML R 76-1:2006 • Non-Automatic Weighing Instruments
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onScanAnother && (
              <button
                onClick={onScanAnother}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 shadow-2xs transition-colors"
              >
                <QrCode size={13} />
                <span className="hidden sm:inline">Scan Another</span>
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
              title="Share verification URL"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
              <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
              title="Print Certificate Verification Record"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <RefreshCw size={28} className="mx-auto text-indigo-600 animate-spin" />
            <div className="text-sm font-bold text-slate-900">Verifying Instrument ID...</div>
            <p className="text-xs text-slate-500 font-mono">{publicInstrumentId}</p>
          </div>
        ) : !result ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <AlertTriangle size={28} className="mx-auto text-amber-500" />
            <div className="text-sm font-bold">Verification record not available</div>
          </div>
        ) : (
          <>
            {/* BIG STATUS HERO CARD */}
            <section
              id="verification-status-banner"
              className={`rounded-2xl border p-5 sm:p-6 ${currentStatus.bg} ${currentStatus.border} shadow-xs transition-all`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  {currentStatus.icon}
                  <div>
                    <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1 ${currentStatus.badgeBg}`}>
                      {result.status}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      {currentStatus.title}
                    </h2>
                    <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${currentStatus.text}`}>
                      {currentStatus.subtitle}
                    </p>
                  </div>
                </div>

                {/* Verification Authority Source Tag */}
                <div className="sm:text-right text-xs text-slate-600 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-2xs shrink-0 self-stretch sm:self-auto">
                  <div className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider">
                    Verification Source
                  </div>
                  <div className="font-bold text-slate-800 flex items-center sm:justify-end gap-1.5 mt-0.5">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    <span>
                      {result.source === 'SUPABASE_CLOUD'
                        ? 'Authoritative Cloud Database'
                        : 'Local Certified Node'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Verified: {new Date(result.verifiedAt).toLocaleDateString()} {new Date(result.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-xs text-slate-700 leading-relaxed">
                {currentStatus.description}
              </div>

              {/* Notice if a newer session is under review */}
              {result.pendingSession && result.status === 'UNDER_REVIEW' && (
                <div className="mt-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-700" />
                    <span>Session #{result.pendingSession.testSessionNumber} in progress</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    A metrology officer is currently completing verification procedures. The official status will be updated upon final reviewer approval.
                  </p>
                </div>
              )}
            </section>

            {/* INSTRUMENT IDENTITY CARD */}
            {result.instrument && (
              <section
                id="instrument-identity-card"
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Instrument Specification & Nameplate
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                    Class {result.instrument.accuracyClass.replace('CLASS_', '')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Manufacturer</span>
                    <span className="font-bold text-slate-900">{result.instrument.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Model</span>
                    <span className="font-bold text-slate-900">{result.instrument.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Serial Number</span>
                    <span className="font-bold font-mono text-slate-900">{result.instrument.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Jurisdiction Tag</span>
                    <span className="font-bold font-mono text-slate-900">{result.instrument.instrumentIdTag}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Max Capacity (Max)</span>
                    <span className="font-bold font-mono text-slate-900">
                      {result.instrument.maxCapacity} {result.instrument.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Min Capacity (Min)</span>
                    <span className="font-bold font-mono text-slate-900">
                      {result.instrument.minCapacity} {result.instrument.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Verification Scale (e)</span>
                    <span className="font-bold font-mono text-slate-900">
                      {result.instrument.verificationScaleInterval} {result.instrument.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Actual Scale (d)</span>
                    <span className="font-bold font-mono text-slate-900">
                      {result.instrument.actualScaleInterval} {result.instrument.unit}
                    </span>
                  </div>
                </div>

                {result.instrument.patternApprovalNumber && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Pattern Approval Certificate:</span>
                    <span className="font-bold font-mono text-slate-800">
                      {result.instrument.patternApprovalNumber}
                    </span>
                  </div>
                )}

                {/* Internal link for laboratory technicians */}
                {onViewInternalInstrument && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => onViewInternalInstrument(result.instrument!.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                    >
                      <span>Open in Technician Management Console</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* LATEST FINALIZED REPORT CARD */}
            {result.latestFinalizedReport && (
              <section
                id="finalized-report-card"
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Authoritative Verification Certificate
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    Report #{result.latestFinalizedReport.reportNumber} (Rev {result.latestFinalizedReport.currentRevision})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Standard Applied</span>
                    <span className="font-bold text-slate-900">{result.latestFinalizedReport.standardEdition}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date of Finalization</span>
                    <span className="font-bold text-slate-900">
                      {new Date(result.latestFinalizedReport.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Accredited Laboratory</span>
                    <span className="font-bold text-slate-900">
                      {result.latestFinalizedReport.laboratoryName || 'National Metrology Laboratory'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Testing Metrologist</span>
                    <span className="font-medium text-slate-800">
                      {result.latestFinalizedReport.technicianName || 'Certified Technician'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Sign-Off Reviewer</span>
                    <span className="font-medium text-slate-800">
                      {result.latestFinalizedReport.reviewerName || 'Senior Reviewer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Accreditation Number</span>
                    <span className="font-medium font-mono text-slate-800">
                      {result.latestFinalizedReport.accreditationNumber || 'ISO/IEC 17025 Accr.'}
                    </span>
                  </div>
                </div>

                {/* SHA-256 Digital Certificate Hash */}
                {result.latestFinalizedReport.sha256IntegrityHash && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[10px] font-semibold uppercase">
                      <span>SHA-256 Document Integrity Fingerprint</span>
                      <span className="text-emerald-700 font-bold">Cryptographically Verified</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-700 break-all select-all">
                      {result.latestFinalizedReport.sha256IntegrityHash}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* VERIFICATION AUDIT HISTORY */}
            {result.history && result.history.length > 0 && (
              <section
                id="verification-history-card"
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-slate-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Verification & Calibration History
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {result.history.length} recorded session{result.history.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 pl-3">Date</th>
                        <th className="p-2.5">Report #</th>
                        <th className="p-2.5">Result</th>
                        <th className="p-2.5 pr-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-3 font-mono text-slate-700">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {item.reportNumber}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                item.compliance === 'PASSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.compliance === 'FAILED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.compliance === 'PASSED' && <CheckCircle2 size={10} />}
                              {item.compliance === 'FAILED' && <XCircle size={10} />}
                              {item.compliance}
                            </span>
                          </td>
                          <td className="p-2.5 pr-3 text-right font-medium text-slate-600">
                            {item.statusText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Zero-Trust Notice & Disclaimers */}
            <div className="text-center text-[11px] text-slate-400 space-y-1 pt-2">
              <p>
                Zero-Trust Verification Architecture • Public identification via stable UUID only
              </p>
              <p>
                Protected under International Recommendation OIML R 76-1:2006 (E).
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
