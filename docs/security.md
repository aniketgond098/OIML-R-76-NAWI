# Security, RBAC & Audit Architecture

## 1. Role-Based Access Control (RBAC) Matrix

| Action / Capability | ADMIN | LAB_TECHNICIAN | REVIEWER_OFFICER |
| :--- | :---: | :---: | :---: |
| Register / Edit Instrument | ✓ | ✓ | View Only |
| Create Test Session & Enter Raw Observations | ✓ | ✓ | View Only |
| Mark Test Complete / Submit for Review | ✓ | ✓ | View Only |
| Approve / Reject Test Session | View Only | ✗ | ✓ |
| Finalize & Generate Official Report | View Only | ✗ | ✓ |
| Create New Report Revision | View Only | Request | ✓ |
| Create / Edit Metrology Rules | ✓ | ✗ | ✗ |
| Manage Laboratory Users & Equipment | ✓ | ✗ | ✗ |
| View Full Audit Trail | ✓ | ✓ | ✓ |

## 2. Immutability & Anti-Tamper Safeguards
- Finalized reports cannot be overwritten. Corrections require initiating a formal revision request with mandatory justification.
- Every report revision generates a cryptographic SHA-256 hash across its observation dataset and metrological decision tree.
- All modifications to raw observations trigger append-only audit entries storing actor ID, timestamp, old value, and new value.
