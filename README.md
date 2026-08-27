# OIML R-76 NAWI Legal Metrology Test Report System

A full-stack, production-grade legal metrology software platform for testing and generating compliance test reports for Non-Automatic Weighing Instruments (NAWI) in strict adherence to **OIML Recommendation R 76-1, Edition 2006 (E)**.

---

## Key Features

- **Strict Metrology Traceability**: Every formula, error calculation, and acceptance tolerance maps directly to verified clauses in OIML R 76-1:2006.
- **Three-State Compliance Engine**: Strict `PASS` / `FAIL` / `NOT_EVALUATED` state machine preventing false certification.
- **Zero-Tolerance Decimal Arithmetic**: Exact decimal calculation using `decimal.js` to eliminate JavaScript IEEE-754 floating point inaccuracies.
- **Complete Test Module Suite**:
  - Weighing / Accuracy Test (Flash Point / Turning Point Method $\Delta L$)
  - Repeatability Test ($0.5\,\text{Max}$ and $\text{Max}$ with $\Delta I \le |\text{MPE}|$)
  - Eccentric Loading Test (multi-point receptor visual interface with automated support geometry calculations)
  - Zero-Setting & Zero-Tracking Tests ($\le 0.25\,e$)
  - Tare Device Accuracy & Net Weighing Tests
  - Environmental & Temperature Span Shift Tests
- **Role-Based Access Control (RBAC)**: Enforces separation of duties between `ADMIN`, `LAB_TECHNICIAN`, and `REVIEWER_OFFICER`.
- **Review & Approval Workflow**: Formal review queue, rejection with mandatory comments, and digital sign-off.
- **Dual Export Pipeline**: Generates official PDF documents and editable Microsoft Word (DOCX) reports from the same structured data contract.
- **Audit Trail & Integrity**: Append-only event logging with full value diffs and SHA-256 report verification hashes.
- **Equipment & Calibration Registry**: Reference test weight tracking with expiry validation.

---

## Documentation

- [OIML R-76 Traceability Matrix](docs/OIML-R76-TRACEABILITY.md)
- [System Architecture](docs/architecture.md)
- [Calculation & Metrology Engine](docs/calculation-engine.md)
- [Database Schema](docs/database.md)
- [Report Generation Pipeline](docs/report-generation.md)
- [Security & Access Control](docs/security.md)
- [Testing & Verification Strategy](docs/testing.md)
