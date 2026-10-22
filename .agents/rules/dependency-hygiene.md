# Dependency Hygiene & Tooling Rules

<!-- Workspace rule file: .agents/rules/dependency-hygiene.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Zero Phantom Dependencies (Ghost Deps):**
   - Every external library imported in `src/` MUST be explicitly declared in `package.json` under `dependencies` or `devDependencies`.
   - Never rely on transitive hoisting from peer packages (e.g. `jose`, `clsx`, `tailwind-merge`).
2. **Zero Dead/Unused Dependencies:**
   - If a library is added to `package.json`, its usage must be integrated into the application (e.g., using `cn()` from `@/presentation/utils/cn` instead of bare template strings for Tailwind classes).
   - Libraries that are no longer part of the architecture must be uninstalled.
3. **Repository Naming Standard:**
   - Persistence classes must follow the clean generic pattern `[Entity]Repository` (e.g. `AuditRepository`, `CompanyRepository`), never coupling repository names to database vendors.
4. **Code Quality and Build Integrity:**
   - Code must pass `npm run lint` and `npm test` without warnings before submitting changes.

## When Enforced

- Any modification touching `package.json`, package imports, or infrastructure repositories.
