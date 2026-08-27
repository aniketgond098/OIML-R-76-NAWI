# Testing Strategy & Boundary Value Verification

## 1. Test Architecture
The application incorporates an embedded Metrology Verification Suite testing calculations against golden examples and edge cases:

1. **Unit Tests**:
   - Verification of turning point calculations: $P = I + 0.5e - \Delta L$.
   - Zero-setting error correction: $E_c = E - E_0$.
   - Scale interval calculations: $n = \text{Max} / e$.
   - Multi-unit conversions: $g \leftrightarrow kg \leftrightarrow mg \leftrightarrow t$.

2. **Boundary Testing for MPE (Table 6)**:
   - Load at $49\,999\,e$ (Zone 1 $\pm 0.5\,e$) vs $50\,000\,e$ vs $50\,001\,e$ (Zone 2 $\pm 1.0\,e$).
   - Exact limit error: $E_c = +0.500\,e \to \text{PASS}$ vs $E_c = +0.501\,e \to \text{FAIL}$.
   - Negative error limit: $E_c = -1.000\,e \to \text{PASS}$ vs $E_c = -1.001\,e \to \text{FAIL}$.
   - Zero error: $E_c = 0.000\,e \to \text{PASS}$.

3. **Three-State Compliance Verification**:
   - Any unverified rule $\to \text{NOT\_EVALUATED}$.
   - Incomplete observation row $\to \text{NOT\_EVALUATED}$.
   - Overriding safety: `NOT_EVALUATED` never defaults to `PASS`.
