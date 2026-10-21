# Clean Architecture & DDD Rules

<!-- Workspace rule file: .agents/rules/clean-architecture.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Dependency Direction:** Source code dependencies must point inward only.
   - `domain` must have zero external imports (no React, no Next.js, no Supabase, no Dexie).
   - `application` may only depend on `domain`.
   - `infrastructure` implements domain repository interfaces (`IAuditRepository`, etc.) and handles third-party SDKs.
   - `presentation` calls application use cases through DTOs validated with Zod.
2. **Entities & Value Objects:** Business identity belongs to Entities (`Audit`, `Company`). Immutable domain attributes (e.g., `Cif`, `Score`, `EvidencePhoto`) must be modeled as Value Objects with invariant validation on instantiation.
3. **Use Case Isolation:** Each application use case must represent a single, focused user action (e.g., `EvaluatePointUseCase`, `FinalizeAndSignAuditUseCase`). Use cases must not access HTTP request/response objects directly.
4. **Repository Inversion:** Always define repository interfaces in `src/domain/repositories/` and provide concrete implementations in `src/infrastructure/database/` or `src/infrastructure/storage/`. Unit tests must use in-memory repository mocks.

## When Enforced

- Every code change in `src/domain/`, `src/application/`, and `src/infrastructure/`.
- During automated code reviews, refactoring, and PR generation.

## Exceptions

- Test files (`src/test/`) may import mock adapters and test utilities.
