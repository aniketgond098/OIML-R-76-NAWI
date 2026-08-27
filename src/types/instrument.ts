import { AccuracyClass, MassUnit } from './metrology';

export type InstrumentType =
  | 'Electronic Balance'
  | 'Bench Scale'
  | 'Floor / Platform Scale'
  | 'Weighbridge'
  | 'Crane Scale'
  | 'Hopper / Tank Scale'
  | 'Medical Scale';

export type LoadReceptorType =
  | 'Flat Pan'
  | 'Rectangular Platform'
  | 'Round Plate'
  | 'Weighbridge Deck'
  | 'Hanging Hook'
  | 'Tank / Hopper';

export interface InstrumentComponent {
  id: string;
  componentType: 'Load Cell' | 'Indicator / Terminal' | 'Junction Box' | 'Software Module';
  manufacturer: string;
  model: string;
  serialNumber: string;
  certificateNumber?: string;
  maxCapacity?: number;
  unit?: MassUnit;
}

export interface Instrument {
  id: string;
  instrumentIdTag: string; // e.g. "INST-2026-001"
  manufacturer: string;
  model: string;
  serialNumber: string;
  instrumentType: InstrumentType;
  accuracyClass: AccuracyClass;
  maxCapacity: number; // in primary unit
  minCapacity: number; // in primary unit
  verificationScaleInterval: number; // e (in primary unit)
  actualScaleInterval: number; // d (in primary unit)
  unit: MassUnit;
  numberOfIntervals: number; // n = Max / e
  tareType?: 'None' | 'Subtractive' | 'Additive' | 'Preset';
  maxTare?: number;
  additiveTare?: number;
  
  // Platform & Sensor characteristics
  loadReceptorType: LoadReceptorType;
  numberOfSupportPoints: number; // N (e.g. 4 for standard platform, 6-8 for weighbridge)
  platformDimensions?: string; // e.g. "1200 x 1200 mm"
  
  // Electronics & Firmware
  softwareVersion: string;
  powerSupply: string; // e.g. "230V AC 50Hz" or "12V DC Battery"
  operatingTemperatureMin: number; // in °C (default -10)
  operatingTemperatureMax: number; // in °C (default +40)
  
  // Identification & Approval
  patternApprovalNumber?: string;
  markingDetails?: string;
  notes?: string;
  
  // Relations
  laboratoryId: string;
  components: InstrumentComponent[];
  createdAt: string;
  updatedAt: string;
}
