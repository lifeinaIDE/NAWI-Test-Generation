# Open Questions & Legal-Metrology Items Requiring Domain Validation

> **Project ID:** SIH26035 — Smart India Hackathon 2026  
> **Phase:** Phase 0 — Metrological Validation & Open Specifications  
> **Notice:** All items below are flagged with disclaimer **D3: Requires domain validation**. They represent legal-metrology ambiguities or configuration gaps to be validated with an OIML R-76 technical committee or certified legal-metrology officer prior to production certification.

---

## 1. MPE Tables for Accuracy Classes I, II, and IIII

### Current Status in Prototype
The active rule-set (`OIML-R76-2006-V1`) specifies precise step-tier bounds and MPE limits for **Class III (Medium Accuracy)** based on OIML R-76-1:2006 Table 6:
- $0 \le m \le 500e \implies \text{MPE} = \pm 0.5e$
- $500e < m \le 2000e \implies \text{MPE} = \pm 1.0e$
- $2000e < m \le 10000e \implies \text{MPE} = \pm 1.5e$

### Domain Validation Required
Exact boundary tiers for the remaining three classes must be validated against national statutory regulations:
- **Class I (Special Accuracy)**:
  - $0 \le m \le 50\,000e \implies \pm 0.5e$
  - $50\,000e < m \le 200\,000e \implies \pm 1.0e$
  - $m > 200\,000e \implies \pm 1.5e$
- **Class II (High Accuracy)**:
  - $0 \le m \le 5\,000e \implies \pm 0.5e$
  - $5\,000e < m \le 20\,000e \implies \pm 1.0e$
  - $20\,000e < m \le 100\,000e \implies \pm 1.5e$
- **Class IIII (Ordinary Accuracy)**:
  - $0 \le m \le 50e \implies \pm 0.5e$
  - $50e < m \le 200e \implies \pm 1.0e$
  - $200e < m \le 1\,000e \implies \pm 1.5e$

*Question for domain expert:* Are in-service multipliers ($2 \times \text{MPE}$) strictly enforced automatically after a set calendar duration, or selected manually as a report evaluation mode?

---

## 2. Discrimination Test Criterion & Digital Indication

### Current Status in Prototype
Per OIML R-76 Clause A.4.8, when an extra load of $1.4d$ is gently placed on the load receptor, the indicated value must advance by at least $1d$. The prototype calculates:
$$\Delta I = I_{\text{with } 1.4d} - I_{\text{base}}$$
Compliance is awarded if $\Delta I \ge d$.

### Domain Validation Required
- For modern high-precision digital balances equipped with automatic zero-tracking (AZT) or digital filters:
  1. Does the test require disabling Automatic Zero-Tracking prior to applying the $1.4d$ mass?
  2. For balances where $d < e$ (e.g. multi-interval or fine-reading balances where $d = 0.1e$), does the $1.4d$ criterion apply to the verification interval $e$ or actual interval $d$?

---

## 3. Mandatory Tests vs Optional Tests per Accuracy Class

### Current Status in Prototype
The prototype implements 4 core tests:
1. `WEIGHING_PERFORMANCE` (Mandatory for all instruments)
2. `ECCENTRICITY` (Mandatory for all instruments)
3. `REPEATABILITY` (Mandatory for all instruments)
4. `DISCRIMINATION` (Mandatory for all instruments)

Thirteen (13) additional tests from OIML R-76 are scheduled as placeholders (e.g., Tare & Tare-Weighing, Zero Setting, Warm-up, Tilting, Temperature Influence, Humidity, Voltage Variations).

### Domain Validation Required
- Is the Discrimination test mandatory for initial verification of commercial Class III and Class IIII retail scales under Indian Legal Metrology (Weights & Measures) rules, or is it reserved for type approval?
- Under what conditions is the Eccentricity test waived (e.g., continuous in-line weighers or overhead monorail scales where eccentric loading is physically impossible)?

---

## 4. MPE Band Edge Convention (Boundary Handling)

### Current Status in Prototype
The calculation engine uses inclusive upper bounds:
$$\text{load} \le \text{tier.maxLoadInE}$$
For example, a load of exactly $500e$ on a Class III scale is evaluated under Tier 1 ($\pm 0.5e$), whereas $500.1e$ steps into Tier 2 ($\pm 1.0e$).

### Domain Validation Required
- Does standard OIML R-76 interpretation treat the boundary as $m \le 500e$ or $m < 500e$?
- When loads are expressed in physical mass units (e.g. kilograms) that convert to decimal multiples of $e$ with floating-point approximations, what is the exact tolerance epsilon ($10^{-6}$ or zero-tolerance round-to-nearest)?

---

## 5. Amber Warning Ratio (0.9 MPE)

### Current Status in Prototype
The calculation engine and frontend provide three distinct status levels:
- **`PASS` (Green)**: $|E_c| \le 0.9 \times \text{MPE}$
- **`WARNING` (Amber)**: $0.9 \times \text{MPE} < |E_c| \le 1.0 \times \text{MPE}$
- **`FAIL` (Red)**: $|E_c| > 1.0 \times \text{MPE}$

### Domain Validation Required
- OIML R-76 certificates are strictly binary: an instrument is either compliant or non-compliant.
- *Question for domain expert:* Does displaying an amber warning at 90% MPE assist technicians during calibration adjustments without jeopardizing the legal validity of the certificate?
- The prototype maintains the warning as an advisory indicator while recording the formal legal evaluation as `PASS`. Is this advisory convention acceptable to auditing inspectors?
