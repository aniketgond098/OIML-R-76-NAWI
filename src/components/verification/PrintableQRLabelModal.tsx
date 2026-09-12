import React, { useState, useEffect, useRef } from 'react';
import { Instrument } from '../../types/instrument';
import { qrService } from '../../services/qr/qrService';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Scale,
} from 'lucide-react';

interface Props {
  instrument: Instrument;
  onClose: () => void;
  onNavigateToVerification?: (publicId: string) => void;
}

type LabelSize = 'standard' | 'compact' | 'square';

export const PrintableQRLabelModal: React.FC<Props> = ({
  instrument,
  onClose,
  onNavigateToVerification,
}) => {
  const [labelSize, setLabelSize] = useState<LabelSize>('standard');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const publicVerificationId = instrument.publicVerificationId || instrument.id;
  const verificationUrl = qrService.buildVerificationUrl(publicVerificationId);

  useEffect(() => {
    setIsGenerating(true);
    qrService
      .generateDataUrl(publicVerificationId, {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
      .then((url) => {
        setQrDataUrl(url);
        setIsGenerating(false);
      })
      .catch((err) => {
        console.error('Failed to generate QR code data URL:', err);
        setIsGenerating(false);
      });
  }, [publicVerificationId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-Verification-${instrument.serialNumber || instrument.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const accuracyClassLabel = instrument.accuracyClass.replace('CLASS_', '');

  return (
    <div
      id="printable-qr-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="printable-qr-modal-content"
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Physical Instrument QR Verification Sticker
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Print this sticker and affix directly to the weighing instrument for on-site scanning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Label Size:</span>
            {(
              [
                { id: 'standard', label: 'Standard (70x50 mm)' },
                { id: 'compact', label: 'Compact (50x30 mm)' },
                { id: 'square', label: 'Square (45x45 mm)' },
              ] as const
            ).map((size) => (
              <button
                key={size.id}
                onClick={() => setLabelSize(size.id)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  labelSize === size.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
              title="Download QR code image PNG"
            >
              <Download size={13} />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Printer size={14} />
              <span>Print Sticker</span>
            </button>
          </div>
        </div>

        {/* Modal Body & Printable Preview Area */}
        <div className="p-5 sm:p-6 bg-slate-100/70 flex flex-col items-center justify-center min-h-[300px]">
          {/* Printable Label Wrapper */}
          <div
            ref={printableAreaRef}
            id="printable-label-sticker"
            className="bg-white border-2 border-slate-900 shadow-md rounded-lg overflow-hidden transition-all text-slate-900 print:shadow-none print:border-black"
            style={{
              width: labelSize === 'standard' ? '380px' : labelSize === 'compact' ? '320px' : '300px',
            }}
          >
            {/* Header of the physical sticker */}
            <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-[11px] tracking-wider uppercase">
                <Scale size={13} className="text-indigo-300" />
                <span>LEGAL METROLOGY NAWI</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                OIML R 76
              </span>
            </div>

            {/* Content of physical sticker */}
            {labelSize === 'standard' && (
              <div className="p-3.5 flex items-center gap-3.5">
                {/* QR Code */}
                <div className="shrink-0 bg-white p-1 rounded border border-slate-300">
                  {isGenerating ? (
                    <div className="w-28 h-28 flex items-center justify-center text-slate-400 text-xs">
                      Loading...
                    </div>
                  ) : (
                    <img src={qrDataUrl} alt="Verification QR Code" className="w-28 h-28 block" />
                  )}
                </div>

                {/* Metadata Column */}
                <div className="min-w-0 flex-1 space-y-1 text-slate-800">
                  <div className="font-bold text-xs leading-tight text-slate-900 truncate">
                    {instrument.manufacturer} {instrument.model}
                  </div>
                  <div className="text-[10px] text-slate-600 space-y-0.5">
                    <div>
                      SN: <strong className="font-mono text-slate-900">{instrument.serialNumber}</strong>
                    </div>
                    <div>
                      Tag: <strong className="font-mono text-slate-900">{instrument.instrumentIdTag}</strong>
                    </div>
                    <div>
                      Class: <strong className="text-indigo-700">Class {accuracyClassLabel}</strong>
                    </div>
                    <div>
                      Max: <strong className="font-mono">{instrument.maxCapacity} {instrument.unit}</strong> | e: <strong className="font-mono">{instrument.verificationScaleInterval} {instrument.unit}</strong>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-200">
                    <span className="block text-[8px] font-bold tracking-tight text-indigo-900 uppercase">
                      SCAN TO VERIFY COMPLIANCE
                    </span>
                    <span className="block text-[8px] text-slate-400 font-mono truncate">
                      ID: {publicVerificationId.slice(0, 18)}...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {labelSize === 'compact' && (
              <div className="p-2.5 flex items-center gap-3">
                <div className="shrink-0 bg-white p-0.5 rounded border border-slate-300">
                  <img src={qrDataUrl} alt="Verification QR" className="w-20 h-20 block" />
                </div>
                <div className="min-w-0 flex-1 text-[10px] space-y-0.5">
                  <div className="font-bold truncate text-slate-900 leading-tight">
                    {instrument.manufacturer} {instrument.model}
                  </div>
                  <div>SN: <span className="font-mono font-bold">{instrument.serialNumber}</span></div>
                  <div>Class {accuracyClassLabel} | Max: {instrument.maxCapacity} {instrument.unit}</div>
                  <div className="text-[8px] font-bold text-indigo-900 pt-0.5 uppercase">
                    SCAN TO VERIFY
                  </div>
                </div>
              </div>
            )}

            {labelSize === 'square' && (
              <div className="p-3 flex flex-col items-center text-center space-y-1.5">
                <img src={qrDataUrl} alt="Verification QR" className="w-32 h-32 block mx-auto border border-slate-200 rounded p-1" />
                <div className="text-[10px] font-bold text-slate-900 truncate max-w-full">
                  {instrument.manufacturer} {instrument.model}
                </div>
                <div className="text-[9px] font-mono text-slate-600">
                  SN: {instrument.serialNumber} • Class {accuracyClassLabel}
                </div>
                <div className="text-[8px] font-bold text-indigo-900 uppercase tracking-tight">
                  SCAN FOR OIML R-76 STATUS
                </div>
              </div>
            )}

            {/* Sticker Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-3 py-1 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>LEGAL METROLOGY VERIFICATION</span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <ShieldCheck size={9} /> PASS/FAIL CHECK
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer with URL & Quick Test Link */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 font-medium">Encoded Verification URL:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copied ? 'Copied URL' : 'Copy URL'}</span>
              </button>

              {onNavigateToVerification && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToVerification(publicVerificationId);
                  }}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <ExternalLink size={12} />
                  <span>Preview Verification Page</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 truncate select-all">
            {verificationUrl}
          </div>
        </div>
      </div>
    </div>
  );
};
