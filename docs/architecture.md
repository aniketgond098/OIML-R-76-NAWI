# System Architecture

## 1. Overview
The NAWI OIML R-76 Test Report System is structured as a decoupled, multi-tier legal metrology platform adhering strictly to OIML R 76-1:2006.

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│  React 19 + Tailwind CSS + Lucide Icons + Print/PDF Viewers │
└──────────────────────────────┬──────────────────────────────┘
                               │ UI Events & Data Entry
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION SERVICES LAYER                  │
│  Session Manager, Audit Logger, Report Generator, RBAC      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    OIML RULE & DECISION     │ │    METROLOGY CALCULATION    │
│           ENGINE            │ │           ENGINE            │
│  - Table 3 Classes          │ │  - Decimal Arithmetic       │
│  - Table 6 MPE Bands        │ │  - Turning Point (Flash)    │
│  - Clause Traceability      │ │  - Eccentricity & Support   │
│  - Status Validation        │ │  - Repeatability Delta I    │
│  (VERIFIED / NOT_EVAL)      │ │  - Zero & Tare Accuracy     │
└─────────────────────────────┘ └─────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 PERSISTENCE & REPOSITORY                    │
│  - IndexedDB / LocalStorage / Server Sync Storage           │
│  - Immutable Report Revision Snapshots + SHA-256 Hashes     │
│  - Append-Only Audit Trail                                  │
└─────────────────────────────────────────────────────────────┘
```

## 2. Metrology Domain Decoupling
To satisfy legal metrology accreditation standards:
- The `metrology/` module has zero UI dependencies.
- All calculations are pure functions operating on explicit `MetrologicalValue` structures (value, unit, decimal precision).
- No floating-point inaccuracies: `decimal.js` is employed for fractional weights ($\Delta L$), interval divisions, and threshold comparisons.
