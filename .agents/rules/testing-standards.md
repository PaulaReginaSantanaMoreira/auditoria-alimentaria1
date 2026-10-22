# Testing Standards & Quality Gates

<!-- Workspace rule file: .agents/rules/testing-standards.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Triple AAA Pattern (Mandatory):**
   - Every test case MUST be structured into three clearly commented phases:
     - `// Arrange` (Setup data, entities, and dependencies)
     - `// Act` (Execute the specific behavior or method under test)
     - `// Assert` (Validate all resulting expectations together at the end)
   - NEVER interleave assertions and actions within loops or multi-stage steps in a single test case.
2. **Anti-Tautology Policy:**
   - NEVER write tests that only verify static mock declarations, in-memory Map insertions, or trivial getter/setter assignments.
   - Tests must validate actual business invariants, boundary condition errors, state transitions, or calculations.
3. **Language Conventions for Tests:**
   - Descriptors (`describe`, `it`), test variable names, and assertion failure messages MUST be written in **English**.
   - Domain-specific legal references and regulatory titles (CE 852/2004, ISO 22000) remain in Spanish.
4. **Test Doubles Organization:**
   - All in-memory repository fakes and test doubles must reside strictly in `src/test/doubles/`. Never define test doubles inside `application/use-cases/__tests__/`.
5. **Component Testing Standards:**
   - UI component tests must use `@testing-library/react` and verify user actions (`fireEvent` / `userEvent`) and accessibility labels, avoiding implementation detail testing.

## When Enforced

- Whenever creating, updating, or reviewing test files in `src/**/__tests__/`.
