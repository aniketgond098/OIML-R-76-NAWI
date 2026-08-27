import { describe, it, expect } from 'vitest';
import { getMPEInE } from '../src/metrology/calculations/weighing';

describe('OIML R 76-1:2006 Clause 3.5.1 Table 6 - MPE Initial Verification', () => {
  describe('Class I Boundaries (50,000 e and 200,000 e)', () => {
    it('should return 0.5 e at zero load', () => {
      expect(getMPEInE('CLASS_I', 0).mpeE).toBe(0.5);
    });

    it('should return 0.5 e just below first boundary (49,999.9 e)', () => {
      expect(getMPEInE('CLASS_I', 49999.9).mpeE).toBe(0.5);
    });

    it('should return 0.5 e at exact first boundary (50,000 e)', () => {
      expect(getMPEInE('CLASS_I', 50000).mpeE).toBe(0.5);
    });

    it('should return 1.0 e just above first boundary (50,000.1 e)', () => {
      expect(getMPEInE('CLASS_I', 50000.1).mpeE).toBe(1.0);
    });

    it('should return 1.0 e just below second boundary (199,999.9 e)', () => {
      expect(getMPEInE('CLASS_I', 199999.9).mpeE).toBe(1.0);
    });

    it('should return 1.0 e at exact second boundary (200,000 e)', () => {
      expect(getMPEInE('CLASS_I', 200000).mpeE).toBe(1.0);
    });

    it('should return 1.5 e just above second boundary (200,000.1 e)', () => {
      expect(getMPEInE('CLASS_I', 200000.1).mpeE).toBe(1.5);
    });
  });

  describe('Class II Boundaries (5,000 e and 20,000 e)', () => {
    it('should return 0.5 e at zero load', () => {
      expect(getMPEInE('CLASS_II', 0).mpeE).toBe(0.5);
    });

    it('should return 0.5 e at exact 5,000 e', () => {
      expect(getMPEInE('CLASS_II', 5000).mpeE).toBe(0.5);
    });

    it('should return 1.0 e at 5,000.01 e', () => {
      expect(getMPEInE('CLASS_II', 5000.01).mpeE).toBe(1.0);
    });

    it('should return 1.0 e at exact 20,000 e', () => {
      expect(getMPEInE('CLASS_II', 20000).mpeE).toBe(1.0);
    });

    it('should return 1.5 e at 20,000.01 e', () => {
      expect(getMPEInE('CLASS_II', 20000.01).mpeE).toBe(1.5);
    });
  });

  describe('Class III Boundaries (500 e and 2,000 e)', () => {
    it('should return 0.5 e at zero load', () => {
      expect(getMPEInE('CLASS_III', 0).mpeE).toBe(0.5);
    });

    it('should return 0.5 e at exact 500 e', () => {
      expect(getMPEInE('CLASS_III', 500).mpeE).toBe(0.5);
    });

    it('should return 1.0 e at 500.1 e', () => {
      expect(getMPEInE('CLASS_III', 500.1).mpeE).toBe(1.0);
    });

    it('should return 1.0 e at exact 2,000 e', () => {
      expect(getMPEInE('CLASS_III', 2000).mpeE).toBe(1.0);
    });

    it('should return 1.5 e at 2,000.1 e', () => {
      expect(getMPEInE('CLASS_III', 2000.1).mpeE).toBe(1.5);
    });
  });

  describe('Class IIII Boundaries (50 e and 200 e)', () => {
    it('should return 0.5 e at zero load', () => {
      expect(getMPEInE('CLASS_IIII', 0).mpeE).toBe(0.5);
    });

    it('should return 0.5 e at exact 50 e', () => {
      expect(getMPEInE('CLASS_IIII', 50).mpeE).toBe(0.5);
    });

    it('should return 1.0 e at 50.1 e', () => {
      expect(getMPEInE('CLASS_IIII', 50.1).mpeE).toBe(1.0);
    });

    it('should return 1.0 e at exact 200 e', () => {
      expect(getMPEInE('CLASS_IIII', 200).mpeE).toBe(1.0);
    });

    it('should return 1.5 e at 200.1 e', () => {
      expect(getMPEInE('CLASS_IIII', 200.1).mpeE).toBe(1.5);
    });
  });
});

describe('OIML R 76-1:2006 Clause 3.5.2 - In-Service Verification (MPE Doubled)', () => {
  it('should double MPE for Class III in-service verification', () => {
    expect(getMPEInE('CLASS_III', 500, true).mpeE).toBe(1.0);
    expect(getMPEInE('CLASS_III', 2000, true).mpeE).toBe(2.0);
    expect(getMPEInE('CLASS_III', 3000, true).mpeE).toBe(3.0);
  });

  it('should double MPE for Class I in-service verification', () => {
    expect(getMPEInE('CLASS_I', 50000, true).mpeE).toBe(1.0);
    expect(getMPEInE('CLASS_I', 200000, true).mpeE).toBe(2.0);
    expect(getMPEInE('CLASS_I', 300000, true).mpeE).toBe(3.0);
  });
});
