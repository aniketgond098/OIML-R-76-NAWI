import { MassUnit } from './metrology';

export type WeightClass = 'E1' | 'E2' | 'F1' | 'F2' | 'M1' | 'M2' | 'M3';

export interface TestEquipment {
  id: string;
  equipmentIdTag: string; // e.g. "STD-WT-001"
  name: string; // e.g. "Standard Weight Set F1 (1mg - 10kg)"
  manufacturer: string;
  model: string;
  serialNumber: string;
  equipmentType: 'Standard Weights' | 'Thermometer / Hygrometer' | 'Barometer' | 'Digital Caliper' | 'Power Supply Simulator';
  weightClass?: WeightClass;
  nominalRange: string; // e.g. "1 mg to 20 kg"
  uncertainty?: string; // e.g. "U = 0.05 mg (k=2)"
  
  calibrationCertificateNumber: string;
  calibratedBy: string; // e.g. "National Physical Laboratory / NABL Accredited Lab"
  calibrationDate: string; // YYYY-MM-DD
  calibrationExpiryDate: string; // YYYY-MM-DD
  isExpired: boolean;
  status: 'ACTIVE' | 'CALIBRATION_DUE' | 'OUT_OF_SERVICE';
  notes?: string;
  laboratoryId: string;
}
