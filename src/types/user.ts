export type UserRole = 'ADMIN' | 'LAB_TECHNICIAN' | 'REVIEWER_OFFICER';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  designation: string; // e.g. "Senior Metrology Engineer", "Verification Officer"
  laboratoryId: string;
  laboratoryName: string;
  avatarUrl?: string;
  signatureText?: string;
  createdAt: string;
}

export interface Laboratory {
  id: string;
  name: string;
  legalAddress: string;
  city: string;
  country: string;
  accreditationNumber: string; // e.g. "NABL-ISO/IEC-17025-2017-MET-0042"
  accreditationBody: string; // e.g. "National Accreditation Board for Testing and Calibration Laboratories"
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
}
