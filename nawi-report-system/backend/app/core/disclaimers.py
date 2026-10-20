"""
Mandatory disclaimer strings for OIML R-76 NAWI Test Report Management System.
Defined once as constants, imported everywhere per project rules.
"""

D1: str = (
    "Preliminary automated evaluation based on the configured OIML R-76 rule-set. "
    "Final acceptance remains subject to review and authorization by competent legal-metrology personnel."
)

D2: str = "Planned — Not implemented in prototype."

D3: str = "Requires domain validation."

D4: str = (
    "Prototype integrity hash — not a legally valid digital signature. "
    "Digital signature integration planned for production deployment."
)

DISCLAIMERS = {
    "D1": D1,
    "D2": D2,
    "D3": D3,
    "D4": D4,
}
