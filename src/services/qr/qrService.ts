import QRCode from 'qrcode';

/**
 * Stable UUID generator for Public Instrument Verification
 */
export function generatePublicVerificationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Cryptographically strong fallback
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant RFC 4122
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Builds the canonical public verification URL
 */
export function buildVerificationUrl(publicVerificationId: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://nawi-verification.org';
  return `${origin}/verify/${encodeURIComponent(publicVerificationId)}`;
}

/**
 * Extracts publicVerificationId from any scanned QR text or URL
 */
export function extractVerificationId(scannedText: string): string | null {
  if (!scannedText) return null;
  const trimmed = scannedText.trim();

  // Pattern 1: URL with /verify/<id>
  const pathMatch = trimmed.match(/\/verify\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // Pattern 2: Query param ?verify=<id> or &verify=<id>
  const queryMatch = trimmed.match(/[?&]verify=([a-zA-Z0-9_-]+)/i);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }

  // Pattern 3: Hash #/verify/<id>
  const hashMatch = trimmed.match(/#\/verify\/([a-zA-Z0-9_-]+)/i);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1];
  }

  // Pattern 4: Direct UUID or verification ID format (e.g. 8-4-4-4-12 or INST-...)
  const uuidMatch = trimmed.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/);
  if (uuidMatch) {
    return trimmed;
  }

  // Pattern 5: Alphanumeric identifier if pasted directly (min 6 chars)
  if (/^[a-zA-Z0-9_-]{6,64}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Generates high-resolution QR Code Data URL (PNG)
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    width: options?.width || 320,
    margin: options?.margin !== undefined ? options?.margin : 2,
    color: {
      dark: options?.darkColor || '#0f172a',
      light: options?.lightColor || '#ffffff',
    },
  });
}

/**
 * Generates SVG string for sharp vector rendering
 */
export async function generateQRCodeSvg(
  text: string,
  options?: {
    width?: number;
    margin?: number;
  }
): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    width: options?.width || 240,
    margin: options?.margin !== undefined ? options?.margin : 2,
  });
}

/**
 * Downloads a data URL as an image file on the client
 */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
