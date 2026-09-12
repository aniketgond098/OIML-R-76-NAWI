import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { qrService } from '../../services/qr/qrService';
import { db } from '../../services/storage/database';
import {
  X,
  Camera,
  Upload,
  Keyboard,
  QrCode,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onScanSuccess: (publicId: string) => void;
}

type ScanTab = 'camera' | 'upload' | 'manual' | 'demo';

export const QRScannerModal: React.FC<Props> = ({ onClose, onScanSuccess }) => {
  const [activeTab, setActiveTab] = useState<ScanTab>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Start camera helper
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser environment.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestScanFrame();
      }
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access or enter the ID manually.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload an image or enter the ID manually.');
      } else {
        setCameraError(
          'Unable to access camera (likely due to iframe sandbox or security restrictions). Please use the Upload Image or Manual Entry options below.'
        );
      }
      setActiveTab('manual');
    }
  };

  // Continuous frame scanning loop
  const requestScanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const publicId = qrService.extractVerificationId(code.data);
          if (publicId) {
            stopCamera();
            onScanSuccess(publicId);
            return;
          }
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(requestScanFrame);
  };

  // Lifecycle for Camera tab
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Handle Image File Upload decoding
  const handleImageUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const publicId = qrService.extractVerificationId(code.data);
          if (publicId) {
            onScanSuccess(publicId);
          } else {
            setManualError(`QR decoded ("${code.data.slice(0, 30)}..."), but could not find a valid instrument verification ID.`);
          }
        } else {
          setManualError('No readable QR code found in the uploaded image. Please ensure good lighting and resolution.');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Manual Input Submit
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setManualError(null);
    if (!manualInput.trim()) {
      setManualError('Please enter an instrument verification ID or URL.');
      return;
    }

    const publicId = qrService.extractVerificationId(manualInput.trim());
    if (publicId) {
      onScanSuccess(publicId);
    } else {
      setManualError('Could not recognize a valid verification ID or URL format. Example: 457a4e69-0268-450f-a3e1-70bf6d246698');
    }
  };

  // Registered instruments for Demo quick-testing
  const registeredInstruments = db.getInstruments();

  return (
    <div
      id="qr-scanner-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="qr-scanner-modal-content"
        className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">
                Scan Instrument Verification QR
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Scan sticker on physical NAWI instrument to verify OIML R 76 compliance
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'camera'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera size={14} />
            <span className="hidden sm:inline">Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Upload Image</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Keyboard size={14} />
            <span className="hidden sm:inline">Manual ID</span>
          </button>
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'demo'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search size={14} />
            <span className="hidden sm:inline">Demo Pick</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {/* TAB 1: LIVE CAMERA */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-square max-h-[300px] w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Animated viewfinder overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl relative shadow-lg">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-400 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-400 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-400 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-400 -mb-1 -mr-1" />
                      <div className="w-full h-0.5 bg-indigo-400/80 absolute top-1/2 animate-pulse shadow-xs" />
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="p-4 text-center text-rose-300 text-xs space-y-2">
                    <AlertCircle size={24} className="mx-auto text-rose-400" />
                    <p>{cameraError}</p>
                    <button
                      onClick={() => setActiveTab('manual')}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-semibold text-[11px]"
                    >
                      Use Manual Input
                    </button>
                  </div>
                )}
              </div>

              <p className="text-center text-xs text-slate-500">
                Align the physical QR code inside the frame. Camera scanning runs client-side with zero data transmission.
              </p>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                <Upload size={32} className="text-indigo-600 mb-2" />
                <span className="text-xs font-bold text-slate-800">
                  Click to browse or drop QR image here
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, WEBP, or phone screenshots of QR stickers
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </label>

              {manualError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{manualError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL ID */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification ID or Full URL
                </label>
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    setManualError(null);
                  }}
                  placeholder="e.g. 457a4e69-0268-450f-a3e1-70bf6d246698 or https://.../verify/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {manualError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{manualError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
              >
                Verify Instrument
              </button>
            </form>
          )}

          {/* TAB 4: DEMO TEST PICKER */}
          {activeTab === 'demo' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">
                Select any registered laboratory instrument to simulate scanning its physical QR code:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {registeredInstruments.map((inst) => {
                  const pubId = inst.publicVerificationId || inst.id;
                  return (
                    <button
                      key={inst.id}
                      onClick={() => onScanSuccess(pubId)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-left transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">
                          {inst.manufacturer} {inst.model}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          SN: {inst.serialNumber} • Tag: {inst.instrumentIdTag}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                        Scan Demo
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
