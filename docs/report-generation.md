# Report Generation & Export Engine

## Dual-Format Architecture
Both PDF and editable DOCX reports derive from an identical structured `TestReportData` contract. This ensures metrological equivalence between formats.

```
                  ┌──────────────────────┐
                  │    TestReportData    │
                  │  (Structured Model)  │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    ┌───────────────────┐         ┌───────────────────┐
    │    jsPDF Engine   │         │    docx Engine    │
    │  (Vector Layout)  │         │(Word Document XML)│
    └───────────────────┘         └───────────────────┘
```

## Report Structure
1. **Official Laboratory Header**: Accreditation logo, standard number, unique report ID (`NAWI-RPT-YYYY-XXXXXX`), revision number.
2. **Instrument Under Test (IUT)**: Model, serial number, accuracy class, Max, Min, $e$, $d$, $n$, load cell specs.
3. **Ambient Test Conditions**: Initial and final temperature, relative humidity, barometric pressure.
4. **Reference Standards / Test Equipment**: Standard weights, calibration certificate IDs, validity dates.
5. **Sectioned Test Results**:
   - Weighing / Accuracy Test Table (Load, Indication, Turning Point $\Delta L$, Error $E_c$, MPE, Result).
   - Repeatability Test (Individual runs, $\Delta I$, MPE, Result).
   - Eccentricity Test (Receptor diagram points, $E_c$, MPE, Result).
   - Zero-setting & Tare Accuracy Tests.
   - Influence / Environmental Tests.
6. **Overall Compliance Determination**: Comprehensive PASS/FAIL/NOT EVALUATED badge with rule citation.
7. **Sign-Off & Integrity Verification**: Digital signature placeholder, technician & reviewer timestamps, SHA-256 integrity hash.
