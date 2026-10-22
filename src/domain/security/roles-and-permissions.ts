/**
 * BIOAUDIT PRO — MATRIZ MODULAR DE PERFIS DE ACESSO, PERMISSÕES E ESCOPOS
 * Baseada no padrão RBAC (Role-Based Access Control) desacoplado de flags booleanas.
 */

export type UserRole =
  | "PLATFORM_SUPERADMIN"
  | "TENANT_ADMIN"
  | "AUDITOR"
  | "VIEWER";

export type AuditAccessScope = "TENANT" | "CONFIDENTIAL" | "PRIVATE";

export type Permission =
  | "audit:create"
  | "audit:read_own"
  | "audit:read_tenant"
  | "audit:read_confidential"
  | "audit:sign"
  | "audit:export_pdf"
  | "audit:invalidate"
  | "tenant:manage"
  | "tenant:update_profile"
  | "tenant:view_billing"
  | "subscription:view"
  | "user:update_profile"
  | "users:manage"
  | "rubric:customize";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  PLATFORM_SUPERADMIN: [
    "audit:create",
    "audit:read_own",
    "audit:read_tenant",
    "audit:read_confidential",
    "audit:sign",
    "audit:export_pdf",
    "audit:invalidate",
    "tenant:manage",
    "tenant:update_profile",
    "tenant:view_billing",
    "subscription:view",
    "user:update_profile",
    "users:manage",
    "rubric:customize",
  ],
  TENANT_ADMIN: [
    "audit:create",
    "audit:read_own",
    "audit:read_tenant",
    "audit:sign",
    "audit:export_pdf",
    "audit:invalidate",
    "tenant:update_profile",
    "tenant:view_billing",
    "subscription:view",
    "user:update_profile",
    "users:manage",
  ],
  AUDITOR: [
    "audit:create",
    "audit:read_own",
    "audit:sign",
    "audit:export_pdf",
    "user:update_profile",
  ],
  VIEWER: [
    "audit:read_tenant",
    "audit:export_pdf",
    "user:update_profile",
  ],
} as const;

/**
 * Valida se determinado papel possui a permissão solicitada.
 */
export function hasPermission(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const userRole = role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Verifica se um papel de usuário possui autorização para visualizar um escopo de auditoria.
 */
export function canAccessAuditScope(
  role: UserRole | string | undefined | null,
  scope: AuditAccessScope = "TENANT"
): boolean {
  if (scope === "CONFIDENTIAL") {
    return hasPermission(role, "audit:read_confidential");
  }
  if (scope === "TENANT") {
    return hasPermission(role, "audit:read_tenant") || hasPermission(role, "audit:read_own");
  }
  // PRIVATE: apenas quem tem permissão de leitura própria
  return hasPermission(role, "audit:read_own");
}
