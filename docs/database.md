# Database Schema & Entity Relationships

The schema is architected to represent all laboratory entities with foreign key relationships, audit integrity, and revision snapshots.

## Entity Hierarchy
```
Laboratory (1) ── (N) Equipment
    │
    └── (N) Instruments (1) ── (N) Test Sessions (1) ── (N) Test Instances
                                                                │
                                                                ├── (N) Raw Observations
                                                                ├── (N) Calculated Results
                                                                └── (N) Compliance Results
                                                                        │
                                                                        ▼
                                                                Reports & Revisions
```

## Core Collections
1. **profiles**: User authentication, credentials hash, laboratory affiliation, role (`ADMIN`, `LAB_TECHNICIAN`, `REVIEWER_OFFICER`).
2. **laboratories**: Accreditation number, legal address, contact, authorized signature assets.
3. **instruments**: Complete metrological specs ($Max, Min, e, d, n, Class$, load receptor geometry, support points, software version, manufacturer, serial number).
4. **equipment**: Reference mass standards (Classes $E_1, E_2, F_1, F_2, M_1$), calibration certificates, expiry alerts.
5. **rule_sets & rules**: Versioned metrology rule catalogue (OIML R 76-1:2006) with verification statuses.
6. **test_sessions & test_instances**: Workflow state, ambient conditions, equipment used, technician and reviewer sign-offs.
7. **observations & calculation_results**: Preserved raw inputs and computed intermediate/final values.
8. **reports & report_revisions**: Immutable finalized snapshots, sequential number (`NAWI-RPT-YYYY-XXXXXX`), SHA-256 integrity hash.
9. **audit_logs**: Immutable chronological event stream with diffs (`actor`, `action`, `entity`, `old_value`, `new_value`, `timestamp`, `reason`).
