import React, { useState, useRef } from 'react';
import { Attachment } from '../../types/report';
import { useAuth } from '../../services/auth/authContext';
import { storageService } from '../../services/storage/storageService';
import {
  Paperclip,
  Upload,
  Image as ImageIcon,
  FileText,
  Trash2,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Camera,
  X,
} from 'lucide-react';

interface Props {
  entityType: 'TEST_SESSION' | 'INSTRUMENT' | 'REPORT' | 'EQUIPMENT';
  entityId: string;
  readOnly?: boolean;
}

export const AttachmentManager: React.FC<Props> = ({ entityType, entityId, readOnly = false }) => {
  const { currentUser } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>(() =>
    storageService.getAttachmentsForEntity(entityId)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('NAMEPLATE_PHOTO');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshAttachments = () => {
    setAttachments(storageService.getAttachmentsForEntity(entityId));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Read file as Base64 Data URL for IndexedDB durability and offline viewing
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const newAttachment: Attachment = {
          id: `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          fileType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          dataUrl,
          uploadedBy: currentUser.fullName,
          uploadedAt: new Date().toISOString(),
          category: selectedCategory,
          associatedEntity: entityType,
          associatedEntityId: entityId,
        };

        await storageService.saveAttachment(newAttachment, currentUser);
      }
      refreshAttachments();
    } catch (err) {
      console.error('[AttachmentManager] Error uploading file:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    try {
      await storageService.deleteAttachment(id, currentUser);
      refreshAttachments();
    } catch (err) {
      console.error('[AttachmentManager] Error deleting attachment:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'NAMEPLATE_PHOTO':
        return 'Nameplate / Inscription';
      case 'SEAL_PHOTO':
        return 'Metrological Seal';
      case 'DEFECT_PHOTO':
        return 'Defect / Anomaly';
      case 'TEST_SETUP':
        return 'Test Setup / Load Receptor';
      case 'CALIBRATION_CERT':
        return 'Calibration Certificate';
      case 'INSTRUMENT_PHOTO':
        return 'Instrument Photo';
      default:
        return 'Supporting Document';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Paperclip size={18} className="text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Metrology Evidence & Attachments
          </h3>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {attachments.length}
          </span>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="NAMEPLATE_PHOTO">📷 Nameplate / Inscription Photo</option>
              <option value="SEAL_PHOTO">🔒 Metrological Seal Photo</option>
              <option value="TEST_SETUP">⚖️ Test Setup / Platform Photo</option>
              <option value="DEFECT_PHOTO">⚠️ Defect / Anomaly Photo</option>
              <option value="CALIBRATION_CERT">📜 Calibration Certificate</option>
              <option value="SUPPORTING_DOC">📄 Other Supporting Document</option>
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              <span>{isUploading ? 'Saving...' : 'Add Attachment'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {attachments.length === 0 ? (
        <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Camera size={28} className="mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-600">No attachments recorded</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Attach inspection photos, verification seals, or certificates. Stored locally in IndexedDB and synced to cloud.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attachments.map((att) => {
            const isImage = att.fileType.startsWith('image/') || att.dataUrl.startsWith('data:image/');
            return (
              <div
                key={att.id}
                className="group relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col justify-between"
              >
                {isImage && (
                  <div
                    className="h-32 w-full bg-slate-200 overflow-hidden cursor-pointer relative"
                    onClick={() => setPreviewAttachment(att)}
                  >
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded transition-opacity">
                        View Image
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isImage ? (
                        <ImageIcon size={14} className="text-indigo-600 shrink-0" />
                      ) : (
                        <FileText size={14} className="text-amber-600 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 truncate" title={att.name}>
                        {att.name}
                      </span>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(att.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0"
                        title="Delete attachment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                      {getCategoryLabel(att.category)}
                    </span>
                    <span className="font-mono">{formatFileSize(att.sizeBytes)}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>By {att.uploadedBy}</span>
                    <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{previewAttachment.name}</h4>
                <p className="text-xs text-slate-500">{getCategoryLabel(previewAttachment.category)}</p>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto flex-1 max-h-[70vh]">
              <img
                src={previewAttachment.dataUrl}
                alt={previewAttachment.name}
                className="max-h-full max-w-full object-contain rounded"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Uploaded: {new Date(previewAttachment.uploadedAt).toLocaleString()}</span>
              <a
                href={previewAttachment.dataUrl}
                download={previewAttachment.name}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
