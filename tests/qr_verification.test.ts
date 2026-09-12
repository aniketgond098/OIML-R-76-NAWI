import { describe, it, expect } from 'vitest';
import {
  generatePublicVerificationId,
  buildVerificationUrl,
  extractVerificationId,
} from '../src/services/qr/qrService';
import { VerificationService } from '../src/services/verification/verificationService';

describe('QR Verification Feature - OIML R 76 NAWI', () => {
  describe('QR Service & Identifier Extraction', () => {
    it('generates a valid RFC 4122 v4 UUID for public instrument identification', () => {
      const uuid = generatePublicVerificationId();
      expect(uuid).toMatch(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      );
    });

    it('builds canonical public verification URLs', () => {
      const id = '457a4e69-0268-450f-a3e1-70bf6d246698';
      const url = buildVerificationUrl(id);
      expect(url).toContain(`/verify/${id}`);
    });

    it('extracts verification IDs from path URLs, query params, hashes, and raw UUIDs', () => {
      const uuid = '457a4e69-0268-450f-a3e1-70bf6d246698';

      // Path
      expect(extractVerificationId(`https://nawi.metrology.gov/verify/${uuid}`)).toBe(uuid);

      // Query param
      expect(extractVerificationId(`https://nawi.metrology.gov/?verify=${uuid}`)).toBe(uuid);

      // Hash
      expect(extractVerificationId(`https://nawi.metrology.gov/#/verify/${uuid}`)).toBe(uuid);

      // Raw UUID
      expect(extractVerificationId(uuid)).toBe(uuid);

      // Empty or invalid
      expect(extractVerificationId('')).toBeNull();
      expect(extractVerificationId('abc')).toBeNull();
    });
  });

  describe('Verification Service - Status Determination Hierarchy', () => {
    const service = new VerificationService();

    it('returns INSTRUMENT_NOT_FOUND when identifier does not exist', async () => {
      const result = await service.verifyInstrument('non-existent-id-0000-1111');
      expect(result.status).toBe('INSTRUMENT_NOT_FOUND');
      expect(result.instrument).toBeUndefined();
    });

    it('resolves demo instrument status and ensures sensitive measurements are not leaked', async () => {
      // INST-2026-002 has publicVerificationId 'e81c7f92-5a21-4f1e-9273-df32a819b6e4' with finalized approved report
      const result = await service.verifyInstrument('e81c7f92-5a21-4f1e-9273-df32a819b6e4');

      expect(result.instrument).toBeDefined();
      expect(result.instrument?.manufacturer).toBe('Mettler Toledo Industrial');
      expect(result.instrument?.accuracyClass).toBe('CLASS_III');
      expect(result.status).toBe('PASSED');
      expect(result.latestFinalizedReport).toBeDefined();
      expect(result.latestFinalizedReport?.reportNumber).toBe('NAWI-RPT-2026-000001');

      // Ensure zero-trust: no raw observations, internal draft data, or passwords exposed
      expect((result as any).rawObservations).toBeUndefined();
      expect((result as any).technicianPassword).toBeUndefined();
      expect((result as any).testPoints).toBeUndefined();
    });
  });
});
