/**
 * Mandatory legal-metrology disclaimers for OIML R-76 NAWI Test Report System.
 * Defined once as constants, imported everywhere per project rules.
 */

export const D1 =
  "Preliminary automated evaluation based on the configured OIML R-76 rule-set. " +
  "Final acceptance remains subject to review and authorization by competent legal-metrology personnel.";

export const D2 = "Planned — Not implemented in prototype.";

export const D3 = "Requires domain validation.";

export const D4 =
  "Prototype integrity hash — not a legally valid digital signature. " +
  "Digital signature integration planned for production deployment.";

export const DISCLAIMERS = {
  D1,
  D2,
  D3,
  D4,
} as const;
