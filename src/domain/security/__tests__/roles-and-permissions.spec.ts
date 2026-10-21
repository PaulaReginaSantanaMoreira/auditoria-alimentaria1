import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canAccessAuditScope,
  ROLE_PERMISSIONS,
  UserRole,
} from "../roles-and-permissions";

describe("RBAC & Permissions Modular System", () => {
  it("deve atribuir permissões completas ao PLATFORM_SUPERADMIN, incluindo auditorias confidenciais", () => {
    expect(hasPermission("PLATFORM_SUPERADMIN", "audit:read_confidential")).toBe(true);
    expect(hasPermission("PLATFORM_SUPERADMIN", "tenant:manage")).toBe(true);
    expect(hasPermission("PLATFORM_SUPERADMIN", "rubric:customize")).toBe(true);
    expect(canAccessAuditScope("PLATFORM_SUPERADMIN", "CONFIDENTIAL")).toBe(true);
    expect(canAccessAuditScope("PLATFORM_SUPERADMIN", "TENANT")).toBe(true);
  });

  it("NÃO deve permitir que TENANT_ADMIN ou AUDITOR acessem auditorias com escopo CONFIDENTIAL", () => {
    expect(hasPermission("TENANT_ADMIN", "audit:read_confidential")).toBe(false);
    expect(hasPermission("AUDITOR", "audit:read_confidential")).toBe(false);
    expect(hasPermission("VIEWER", "audit:read_confidential")).toBe(false);

    expect(canAccessAuditScope("TENANT_ADMIN", "CONFIDENTIAL")).toBe(false);
    expect(canAccessAuditScope("AUDITOR", "CONFIDENTIAL")).toBe(false);
    expect(canAccessAuditScope("VIEWER", "CONFIDENTIAL")).toBe(false);
  });

  it("deve permitir que TENANT_ADMIN e VIEWER visualizem escopo TENANT", () => {
    expect(canAccessAuditScope("TENANT_ADMIN", "TENANT")).toBe(true);
    expect(canAccessAuditScope("VIEWER", "TENANT")).toBe(true);
  });

  it("deve negar permissões quando o papel for inválido ou nulo", () => {
    expect(hasPermission(null, "audit:create")).toBe(false);
    expect(hasPermission(undefined, "audit:create")).toBe(false);
    expect(hasPermission("PAPEL_INEXISTENTE" as UserRole, "audit:create")).toBe(false);
  });
});
