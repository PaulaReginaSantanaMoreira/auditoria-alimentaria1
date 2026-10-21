# Food Safety & APPCC Compliance Rules

<!-- Workspace rule file: .agents/rules/sanitary-compliance.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Regulatory Framework:** All sanitary calculation algorithms must conform to **Regulation (EC) No 852/2004**, **Codex Alimentarius**, and **ISO 22000:2018**.
2. **Critical Control Point (CCP / PCC) Veto Logic:**
   - **Point 1.7 (Potable Water Supply):** Infrastructure critical control point.
   - **Point 2.5 (Personnel Exclusion Due to Infectious Symptoms):** Staff hygiene critical control point.
   - **Point 3.1 (Cold Chain Temperature Monitoring):** Process HACCP critical control point.
   - Any evaluation of `NO_CONFORME` on these three points MUST trigger an immediate sanitary veto (`isVetoed: true`, overall score override to failing).
3. **Audit Immutability Post-Signature:** Once an audit is finalized and both auditor and company representative signatures are registered, the audit state becomes immutable. No subsequent point evaluation or evidence alteration is allowed.
4. **Evidence Requirement for Non-Conformities:** Any point marked with a non-conformity (`LEVE`, `GRAVE`, `CRÍTICA`) must require an observation text and at least one attached photographic evidence before the point can be persisted.

## When Enforced

- Modifications to `ComplianceCalculatorService`, `Audit` entity, `ControlPoint` entity, or rubric evaluation use cases.
- Generation of official A4 sanitary audit reports.

## Exceptions

- Mocked test cases deliberately testing edge-case boundary failures.
