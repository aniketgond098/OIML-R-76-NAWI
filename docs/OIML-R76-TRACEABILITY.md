# OIML R-76:2006 Legal Metrology Traceability Matrix

This document provides the definitive metrological traceability for all algorithmic calculations, maximum permissible errors (MPE), and decision rules implemented in the **NAWI Test Report Application**, referenced directly against **OIML Recommendation R 76-1, Edition 2006 (E)**: *"Non-automatic weighing instruments - Part 1: Metrological and technical requirements - Tests"*.

---

## 1. Scope and Versioning

- **Standard**: OIML R 76-1
- **Edition**: 2006 (E)
- **Status of Rules**: VERIFIED
- **Instrument Categories**: Non-Automatic Weighing Instruments (NAWI) - Accuracy Classes I, II, III, IIII.

---

## 2. Metrological Classification & Scale Intervals (Clause 3.1, Table 3)

### Verification Scale Interval $e$, Number of Intervals $n$, and Minimum Capacity $\text{Min}$

| Accuracy Class | Verification Scale Interval ($e$) | Number of Verification Scale Intervals ($n = \text{Max}/e$) Minimum | Maximum | Minimum Capacity ($\text{Min}$) |
| :--- | :--- | :--- | :--- | :--- |
| **Class I (Special)** | $0.001\text{ g} \le e$ | $50\,000$ | No limit | $100\,e$ |
| **Class II (High)** | $0.001\text{ g} \le e \le 0.05\text{ g}$<br>$0.1\text{ g} \le e$ | $100$<br>$5\,000$ | $100\,000$<br>$100\,000$ | $20\,e$<br>$50\,e$ |
| **Class III (Medium)** | $0.1\text{ g} \le e \le 2\text{ g}$<br>$5\text{ g} \le e$ | $100$<br>$500$ | $10\,000$<br>$10\,000$ | $20\,e$<br>$20\,e$ |
| **Class IIII (Ordinary)**| $5\text{ g} \le e$ | $100$ | $1\,000$ | $10\,e$ |

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 3.1.2, Table 3).*

---

## 3. Maximum Permissible Errors (MPE) (Clause 3.5.1, Table 6)

### On Initial Verification:

| For loads $m$ expressed in verification scale intervals $e$ | Class I | Class II | Class III | Class IIII | Maximum Permissible Error (Initial) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Zone 1** | $0 \le m \le 50\,000\,e$ | $0 \le m \le 5\,000\,e$ | $0 \le m \le 500\,e$ | $0 \le m \le 50\,e$ | $\pm 0.5\,e$ |
| **Zone 2** | $50\,000 < m \le 200\,000\,e$ | $5\,000 < m \le 20\,000\,e$ | $500 < m \le 2\,000\,e$ | $50 < m \le 200\,e$ | $\pm 1.0\,e$ |
| **Zone 3** | $m > 200\,000\,e$ | $20\,000 < m \le 100\,000\,e$ | $2\,000 < m \le 10\,000\,e$ | $200 < m \le 1\,000\,e$ | $\pm 1.5\,e$ |

### On Service / In-Service Inspection (Clause 3.5.2):
- $\text{MPE}_{\text{service}} = 2 \times \text{MPE}_{\text{initial}}$

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 3.5.1, Table 6).*

---

## 4. Turning Point / Flash Point Error Determination (Clause A.4.4.3 & Clause 3.5.3.2)

For instruments with digital indication without auxiliary indication device (e.g. $d = e$):

1. **Indication Prior to Rounding ($P$)**:
   $$P = I + \frac{1}{2}e - \Delta L$$
   where:
   - $I$ = Displayed rounded indication
   - $e$ = Verification scale interval
   - $\Delta L$ = Small weights added (typically in steps of $0.1\,e$) until indication changes to $I + e$.

2. **Error Prior to Rounding ($E$)**:
   $$E = P - L = I + \frac{1}{2}e - \Delta L - L$$
   where $L$ is the applied reference load.

3. **Zero Error Correction ($E_0$)**:
   $$E_0 = I_0 + \frac{1}{2}e - \Delta L_0$$

4. **Corrected Error ($E_c$)**:
   $$E_c = E - E_0 = (P - L) - (P_0 - 0)$$

5. **Decision Rule**:
   - `PASS`: $|E_c| \le |\text{MPE}(L)|$
   - `FAIL`: $|E_c| > |\text{MPE}(L)|$
   - `NOT_EVALUATED`: If $\Delta L$ or reference load is omitted.

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause A.4.4.3 & Clause 3.5.3.2).*

---

## 5. Repeatability Test (Clause 3.6.1 & Clause A.4.10)

- **Test Loads**: Approximately $0.5\,\text{Max}$ and $\text{Max}$.
- **Number of weighings**:
  - Class I & II: 6 or 10 series of weighings.
  - Class III & IIII: 3 or 5 series of weighings.
- **Formula**:
  $$\Delta I = I_{\text{max}} - I_{\text{min}}$$
- **Decision Rule**:
  - `PASS`: $\Delta I \le |\text{MPE}(L)|$
  - `FAIL`: $\Delta I > |\text{MPE}(L)|$

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 3.6.1 & Clause A.4.10).*

---

## 6. Eccentric Loading Test (Clause 3.6.2 & Clause A.4.7)

### Test Loads:
- Instruments with $\le 4$ points of support: $L = \frac{1}{3}\text{Max} + \text{Additive Tare}$ (or $\frac{1}{3}\text{Max}$).
- Instruments with $> 4$ points of support: $L = \frac{1}{N - 1}\text{Max}$.
- Receptors taking rolling loads: $L = \text{Appropriate axle rolling load}$.

### Procedure & Requirement:
- Load placed successively on points (e.g. 4 quadrants/corners and center).
- For each position $k$:
  $$E_{c,k} = (I_k + 0.5e - \Delta L_k - L) - E_0$$
- **Decision Rule**:
  - `PASS`: For all positions $k$, $|E_{c,k}| \le |\text{MPE}(L)|$.
  - `FAIL`: If any position $|E_{c,k}| > |\text{MPE}(L)|$.

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 3.6.2 & Clause A.4.7).*

---

## 7. Zero-Setting Tests (Clause 4.5 & Clause A.4.2)

### 7.1 Accuracy of Zero-Setting (Clause 4.5.2 & Clause A.4.2.3)
- After zeroing, the effect on indication shall not exceed $\pm 0.25\,e$.
- Error at zero:
  $$E_0 = I_0 + 0.5e - \Delta L_0$$
- **Decision Rule**:
  - `PASS`: $|E_0| \le 0.25\,e$
  - `FAIL`: $|E_0| > 0.25\,e$

### 7.2 Zero-Setting Range (Clause 4.5.1)
- Non-automatic zero-setting: Range $\le 4\%$ of Max.
- Initial zero-setting: Range $\le 20\%$ of Max.

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 4.5.1, 4.5.2, A.4.2.3).*

---

## 8. Tare Device Accuracy (Clause 4.6.3 & Clause A.4.6)

- Accuracy of Tare: Effect of tare shall be within $\pm 0.25\,e$.
- Tare Weighing: For any tare value $T$, accuracy test up to $(\text{Max} - T)$. MPE applied to Net load.
- **Decision Rule**:
  - `PASS`: $|E_{\text{tare}}| \le 0.25\,e$ and net weighing $|E_{\text{net}}| \le \text{MPE}(\text{Net})$.

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 4.6.3 & Clause A.4.6).*

---

## 9. Temperature Influence on Span (Clause 3.9.2 & Clause A.5.3)

- Standard operating range (unless marked): $-10^\circ\text{C}$ to $+40^\circ\text{C}$.
- Span shift per $5^\circ\text{C}$:
  $$\left|\frac{\Delta E}{\Delta T}\right| \times 5 \le \text{mpe limit}$$
- Class I: special limits; Class II: $1\,e / 5^\circ\text{C}$; Class III/IIII: $1\,e / 5^\circ\text{C}$.

*Verification Status: VERIFIED (OIML R 76-1:2006, Clause 3.9.2 & Annex A.5.3).*

---

## 10. Summary of Three-State Compliance Logic

| State | Condition | Impact on Overall Test Report |
| :--- | :--- | :--- |
| `PASS` | Requirement definitively evaluated, inputs complete, value within verified MPE. | Required for all applicable mandatory tests. |
| `FAIL` | Requirement evaluated, error exceeds MPE or tolerance limit. | Causes Overall Report to be **FAIL**. |
| `NOT_EVALUATED` | Required observations incomplete, rule not verified, or test pending. | Causes Overall Report to be **NOT_EVALUATED**. |
