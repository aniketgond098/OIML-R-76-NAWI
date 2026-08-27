# Calculation Engine & Metrology Specification

## 1. Principle of Separation
Raw laboratory observations entered by technicians are preserved immutably.
```
Raw Observation (I, ΔL, L)
        ↓
Unit Normalization & Decimal Precision
        ↓
Calculated Turning Point & Errors (P, E, E0, Ec)
        ↓
OIML R-76-1:2006 Rule Evaluation (Table 6 MPE)
        ↓
Compliance Decision (PASS / FAIL / NOT_EVALUATED)
```

## 2. Fundamental Formulas (OIML R 76-1:2006)

### 2.1 Turning Point / Flash Point Indication ($P$)
$$P = I + 0.5 \cdot e - \Delta L$$
Where:
- $I$: Indication on the digital display
- $e$: Verification scale interval
- $\Delta L$: Extra load added to reach next indication transition $I + e$

### 2.2 Corrected Error ($E_c$)
$$E = P - L$$
$$E_0 = P_0 - 0 = I_0 + 0.5 \cdot e - \Delta L_0$$
$$E_c = E - E_0$$

### 2.3 Maximum Permissible Error (MPE) Calculation
Calculated dynamically based on Class (I, II, III, IIII), verification scale interval $e$, and load $m = L / e$.

### 2.4 Repeatability Metric ($\Delta I$)
$$\Delta I = I_{\text{max}} - I_{\text{min}}$$
Requirement: $\Delta I \le |\text{MPE}(L)|$.

### 2.5 Eccentric Loading
For support points $N$:
- $N \le 4$: Load $L = \text{Max} / 3$ (or $1/3\,\text{Max} + \text{Additive Tare}$).
- $N > 4$: Load $L = \text{Max} / (N - 1)$.
For each position $k$, $|E_{c,k}| \le |\text{MPE}(L)|$.
