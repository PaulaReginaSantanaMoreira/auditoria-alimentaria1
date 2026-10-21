# RBAC and Multi-Tenant Governance Rules

<!-- Workspace rule file: .agents/rules/rbac-and-tenancy.md
     Loaded automatically by Antigravity for every agent interaction. -->

## Rule

1. **Role-Based Access Control (RBAC):**
   - User authorization is governed strictly by `UserRole`:
     - `PLATFORM_SUPERADMIN`: Global cross-tenant access, tenant lifecycle management, superadmin billing, and global rubric settings.
     - `TENANT_ADMIN`: Management of company auditors/viewers, tenant seat limits, billing status, and full view of tenant audits.
     - `AUDITOR`: In-field audit creation, control point scoring, digital signature capture, and PDF report generation for own assigned audits.
     - `VIEWER`: Read-only tenant audit visualization and report exports.
   - Never use arbitrary boolean flags for authorization. Always evaluate permissions via `hasPermission(role, permission)` using the canonical permissions defined in `src/domain/security/roles-and-permissions.ts`.
2. **Audit Confidentiality & Scopes (`AuditAccessScope`):**
   - Every `Audit` possesses an `accessScope`:
     - `TENANT`: Accessible by all tenant users with `audit:read_tenant` or `audit:read_own`.
     - `CONFIDENTIAL`: Accessible only by users with explicit `audit:read_confidential` (e.g. `PLATFORM_SUPERADMIN`).
     - `PRIVATE`: Accessible solely by the auditor who created or signed the audit (`audit:read_own`).
   - Use `canAccessAuditScope(role, audit.accessScope)` before exposing audit records or endpoints.
3. **Tenant Boundary Isolation:**
   - Multi-tenant data segregation must be preserved in both Domain (`Tenant`, `Subscription`) and Infrastructure (Supabase RLS policies on `tenants`, `tenant_users`, and `audits`).
   - Route handlers must extract and validate the caller's `tenant_id` and `UserRole` before delegating to application use cases.

## When Enforced

- Any modification touching `src/domain/security/`, route handlers (`src/app/api/`), superadmin pages (`src/app/superadmin/`), or Supabase RLS migrations.

## Exceptions

- Seed scripts or CLI administrative bootstrap scripts (e.g., `scripts/create-superadmin.mjs`) executing with service role keys.
