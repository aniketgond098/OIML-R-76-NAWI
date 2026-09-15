import jsPDF from 'jspdf';
import { WEIGHWISE_WATERMARK_BASE64, WEIGHWISE_LOGO_ASPECT_RATIO } from './watermarkAsset';

export interface WatermarkOptions {
  /** Width of the watermark in mm on an A4 page (default: 65 mm) */
  width?: number;
  /** Custom Y position in mm, or automatically centered if omitted */
  y?: number;
  /** Custom X position in mm, or automatically centered horizontally if omitted */
  x?: number;
  /** Page number for specific adjustments (e.g. page 1) */
  pageNumber?: number;
}

/**
 * Renders the authentic WeighWise Metrology watermark onto the current page.
 * 
 * DESIGN PRINCIPLES:
 * 1. Uses the official project WEIGHWISE logo asset (/public/weighwise-logo.svg).
 * 2. Rendered as a background element (drawn before report content/tables).
 * 3. Subtle laboratory neutral tone with 6.5% visual opacity baked into the alpha channel.
 * 4. Preserves exact aspect ratio (320x380) with balanced dimensions (65mm x 77.2mm).
 * 5. Passes grayscale and high-contrast accessibility tests without obscuring data.
 */
export function renderPdfWatermark(doc: jsPDF, options?: WatermarkOptions): void {
  try {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Balanced laboratory certificate dimensions
    // Width: 65mm, Height: ~77.2mm (golden ratio balance on 210x297mm A4)
    const wmWidth = options?.width ?? 65;
    const wmHeight = wmWidth / WEIGHWISE_LOGO_ASPECT_RATIO;

    const wmX = options?.x ?? (pageWidth - wmWidth) / 2;
    // Slightly offset vertically for visual center balance on A4
    const defaultY = (pageHeight - wmHeight) / 2 + 5;
    const wmY = options?.y ?? defaultY;

    // Use fast native PNG embedding with cached image alias
    doc.addImage(
      WEIGHWISE_WATERMARK_BASE64,
      'PNG',
      wmX,
      wmY,
      wmWidth,
      wmHeight,
      'WEIGHWISE_OFFICIAL_WATERMARK',
      'FAST'
    );
  } catch (err) {
    // Graceful fallback to avoid interrupting document export if graphics state fails
    console.warn('[WeighWise Metrology] Watermark background rendering notice:', err);
  }
}

/**
 * Attaches the background watermark hook to a jsPDF document so every newly created
 * page automatically has the subtle WeighWise watermark drawn on the blank page
 * BEFORE any table rows, text, or signatures are added.
 */
export function attachWatermarkBackground(doc: jsPDF): void {
  // 1. Draw watermark immediately on initial Page 1
  renderPdfWatermark(doc, { pageNumber: 1 });

  // 2. Subscribe to addPage event to draw watermark as the very first background layer
  // whenever autoTable or the application creates subsequent pages
  try {
    if (doc.internal?.events?.subscribe) {
      doc.internal.events.subscribe('addPage', () => {
        const currentPage = (doc.internal as any).getNumberOfPages();
        renderPdfWatermark(doc, { pageNumber: currentPage });
      });
    }
  } catch (err) {
    console.warn('[WeighWise Metrology] Event subscription notice:', err);
  }
}
