# Domain Glossary & Legal-Metrology Reference — OIML R-76

> **Project ID:** SIH26035 — Smart India Hackathon 2026  
> **Standard:** OIML Recommendation R-76-1:2006 (E)  
> **Phase:** Phase 0 — Metrological Terminology Specification

---

## 1. Core Metrological Concepts

| Term / Symbol | Definition | Formula / Basis | Domain Validation Status |
|---|---|---|:---:|
| **NAWI** | **Non-Automatic Weighing Instrument**: An instrument that requires the intervention of an operator during the weighing process (e.g. to deposit/remove the load, or to make the weighing observation). | OIML R-76-1 Clause 2.1 | Baseline confirmed |
| **OIML** | **International Organization of Legal Metrology**: Global intergovernmental treaty organization providing harmonized regulatory standards for legal measuring instruments. | OIML Convention | Baseline confirmed |
| **OIML R-76** | The international benchmark recommendation governing metrological requirements and testing procedures for Non-Automatic Weighing Instruments (latest standard: R-76-1 Edition 2006). | OIML R-76-1:2006 | Baseline confirmed |
| **Accuracy Class** | Classification categorizing the precision and application domain of an instrument: <br>• **Class I**: Special accuracy (precision balances, micro-balances)<br>• **Class II**: High accuracy (laboratory balances, analytical balances)<br>• **Class III**: Medium accuracy (commercial retail, bench, platform, axle scales)<br>• **Class IIII**: Ordinary accuracy (crane scales, bulk hopper scales, weighbridges) | OIML R-76-1 Clause 3.1 & Table 3 | Class III verified in prototype; Classes I, II, IIII **Requires domain validation (D3)** |
| **$e$** | **Verification Scale Interval**: The scale value, expressed in units of mass, used for the verification and legal classification of an instrument. It is the legal unit of measurement resolution. | Legal basis for MPE tier evaluation | Baseline confirmed |
| **$d$** | **Actual Scale Interval**: The value, expressed in units of mass, of the difference between two consecutive indicated values for digital indication, or the scale spacing for analogue indication. | Instrument display specification ($d \le e$) | Baseline confirmed |
| **$\text{Max}$** | **Maximum Capacity**: The maximum weighing capacity, not taking into account the additive tare capacity. | Manufacturer specification | Baseline confirmed |
| **$\text{Min}$** | **Minimum Capacity**: The load value below which weighing results may be subject to excessive relative error. | Minimum certified load ($20e$ for Class III, $50e$ for Class II, $100e$ for Class I) | **Requires domain validation (D3)** for class-specific Min limits |
| **$n$** | **Number of Verification Scale Intervals**: The quotient of maximum capacity and verification scale interval: $$n = \frac{\text{Max}}{e}$$ Determines whether an instrument meets the limits of its claimed Accuracy Class. | OIML R-76-1 Table 3 limits:<br>• Class I: $n \ge 50\,000$<br>• Class II: $100 \le n \le 100\,000$<br>• Class III: $500 \le n \le 10\,000$<br>• Class IIII: $100 \le n \le 1\,000$ | Prototype supports $n$ up to 10,000 for Class III; Extended range **Requires domain validation (D3)** |
| **$\text{MPE}$** | **Maximum Permissible Error**: The extreme value of error permitted by specifications or regulations for a given test load with the instrument at zero at no load. Defined separately for Initial Verification ($\text{MPE}_0$) and In-Service Verification ($2 \times \text{MPE}_0$). | OIML R-76-1 Clause 3.5.1, Table 6 | Tier bounds for Classes I, II, IIII **Requires domain validation (D3)** |
| **$E_o$** | **Zero Error**: Error at zero load, determined by finding the flashing point or turning point with small incremental weights ($\Delta L_0$): $$E_0 = I_0 + 0.5e - \Delta L_0 - 0$$ | Zero-setting error formula per Clause A.4.4.3 | Baseline confirmed |
| **$E$** | **Observed Error**: The indicated value ($I$) minus the reference standard mass value ($L$): $$E = I - L$$ | Raw difference before zero correction | Baseline confirmed |
| **$E_c$** | **Corrected Error**: The observed error adjusted for the zero-setting offset: $$E_c = E - E_0 = (I + 0.5e - \Delta L - L) - E_0$$ | OIML R-76 Clause A.4.4.3 | Baseline confirmed |

---

## 2. The Four In-Scope OIML R-76 Test Modules

### A. Weighing Performance Test (`WEIGHING_PERFORMANCE`)
- **Description:** Verifies the accuracy of the instrument over its full operational weighing range using certified standard test masses.
- **Procedure:** Tested with at least 5 distributed test load steps increasing from zero to $\text{Max}$, and decreasing from $\text{Max}$ to zero. Includes test loads at $\text{Min}$, load step points where MPE changes (e.g. $500e, 2000e$), and near $\text{Max}$.
- **Compliance Criterion:** For every load step $m$, $|E_c| \le \text{MPE}(m)$.
- **Warning Threshold:** Warning flagged if $|E_c| \ge 0.9 \times \text{MPE}(m)$ (*90% amber indicator*).
- **Domain Validation Flag:** **Requires domain validation (D3)** on whether decreasing load hysteresis requires separate compliance reporting.

### B. Eccentricity Test (`ECCENTRICITY`)
- **Description:** Verifies that placing a load in different off-center positions across the load receptor does not produce excessive error.
- **Procedure:** An eccentric test load equal to approximately $\frac{1}{3}\text{Max}$ (or $\frac{1}{4}\text{Max}$ for instruments with 4 supports) is applied sequentially to:
  1. Center
  2. Front-Left
  3. Back-Left
  4. Back-Right
  5. Front-Right
- **Compliance Criterion:** The corrected error at each position must satisfy $|E_c| \le \text{MPE}(\text{eccentric load})$.
- **Domain Validation Flag:** Exact load ratio for cantilever/overhead suspension receptors **Requires domain validation (D3)**.

### C. Repeatability Test (`REPEATABILITY`)
- **Description:** Verifies the consistency of the instrument when the same load is repeatedly placed on and removed from the receptor under identical conditions.
- **Procedure:** A series of weighings (minimum 3 weighings at $\approx \frac{1}{2}\text{Max}$ and minimum 3 weighings at $\approx \text{Max}$) are recorded.
- **Compliance Criterion:** The difference between the maximum and minimum indicated values ($I_{\max} - I_{\min}$) in any single test series must not exceed the absolute value of the MPE for that test load:
  $$I_{\max} - I_{\min} \le |\text{MPE}(L)|$$
- **Domain Validation Flag:** Whether 3 repetitions suffice for all industrial verification tiers or 10 repetitions are required for type approval **Requires domain validation (D3)**.

### D. Discrimination Test (`DISCRIMINATION`)
- **Description:** Verifies the sensitivity of the instrument by checking that an additional small test load ($1.4d$) gently placed on or removed from the loaded receptor reliably changes the indication.
- **Procedure:** Tested with the instrument loaded at $\text{Min}$, $\frac{1}{2}\text{Max}$, and $\text{Max}$. A load of $1.4d$ placed on the receptor must cause the display to advance by at least $1d$.
- **Compliance Criterion:** Display advances by $\ge 1d$.
- **Domain Validation Flag:** Method for modern high-resolution digital indicators without analogue or continuous division display **Requires domain validation (D3)**.

---

## 3. Disclaimers Applicable to Metrology Definitions

All metrological outputs in the prototype carry the following mandatory legal disclaimer:
> **D1:** *Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final acceptance remains subject to review and authorization by competent legal-metrology personnel.*
