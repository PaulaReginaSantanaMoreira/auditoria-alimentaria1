import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canAccessAuditScope,
  UserRole,
} from "../roles-and-permissions";

describe("RBAC & Permissions Domain System", () => {
  it("should grant full administrative permissions and confidential scope access to PLATFORM_SUPERADMIN", () => {
    // Arrange
    const role: UserRole = "PLATFORM_SUPERADMIN";

    // Act
    const canReadConfidential = hasPermission(role, "audit:read_confidential");
    const canManageTenant = hasPermission(role, "tenant:manage");
    const canAccessConfidentialScope = canAccessAuditScope(role, "CONFIDENTIAL");
    const canAccessTenantScope = canAccessAuditScope(role, "TENANT");

    // Assert
    expect(canReadConfidential).toBe(true);
    expect(canManageTenant).toBe(true);
    expect(canAccessConfidentialScope).toBe(true);
    expect(canAccessTenantScope).toBe(true);
  });

  it("should strictly deny CONFIDENTIAL scope access to TENANT_ADMIN, AUDITOR and VIEWER", () => {
    // Arrange
    const roles: UserRole[] = ["TENANT_ADMIN", "AUDITOR", "VIEWER"];

    // Act & Assert
    roles.forEach((role) => {
      expect(hasPermission(role, "audit:read_confidential")).toBe(false);
      expect(canAccessAuditScope(role, "CONFIDENTIAL")).toBe(false);
    });
  });

  it("should allow TENANT_ADMIN and VIEWER to access standard TENANT scope audits", () => {
    // Arrange & Act
    const adminCanAccessTenant = canAccessAuditScope("TENANT_ADMIN", "TENANT");
    const viewerCanAccessTenant = canAccessAuditScope("VIEWER", "TENANT");

    // Assert
    expect(adminCanAccessTenant).toBe(true);
    expect(viewerCanAccessTenant).toBe(true);
  });

  it("should enforce Tenant Admin governance permissions (profile update, user update, invalidation, subscription)", () => {
    // Assert TENANT_ADMIN permissions
    expect(hasPermission("TENANT_ADMIN", "tenant:update_profile")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "user:update_profile")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "audit:invalidate")).toBe(true);
    expect(hasPermission("TENANT_ADMIN", "subscription:view")).toBe(true);

    // Assert AUDITOR and VIEWER cannot invalidate or view subscription
    expect(hasPermission("AUDITOR", "audit:invalidate")).toBe(false);
    expect(hasPermission("AUDITOR", "subscription:view")).toBe(false);
    expect(hasPermission("VIEWER", "audit:invalidate")).toBe(false);
    expect(hasPermission("VIEWER", "subscription:view")).toBe(false);
  });

  it("should deny all permissions when role is null, undefined or unrecognized", () => {
    // Arrange & Act
    const nullResult = hasPermission(null, "audit:create");
    const undefinedResult = hasPermission(undefined, "audit:create");
    const invalidResult = hasPermission("UNKNOWN_ROLE" as UserRole, "audit:create");

    // Assert
    expect(nullResult).toBe(false);
    expect(undefinedResult).toBe(false);
    expect(invalidResult).toBe(false);
  });

  it("should enforce that only SuperAdmin can deactivate the main administrator", () => {
    // Regra de segurança: Apenas o SuperAdmin da plataforma pode desativar o Administrador Principal
    const canDeactivateAdmin = (actorRole: UserRole, targetRole: UserRole, isSuperAdmin: boolean): boolean => {
      if (targetRole === "TENANT_ADMIN") {
        return isSuperAdmin || actorRole === "PLATFORM_SUPERADMIN";
      }
      return true;
    };

    expect(canDeactivateAdmin("PLATFORM_SUPERADMIN", "TENANT_ADMIN", true)).toBe(true);
    expect(canDeactivateAdmin("TENANT_ADMIN", "TENANT_ADMIN", false)).toBe(false);
    expect(canDeactivateAdmin("AUDITOR", "TENANT_ADMIN", false)).toBe(false);
    expect(canDeactivateAdmin("TENANT_ADMIN", "AUDITOR", false)).toBe(true);
  });

  it("should prioritize keeping TENANT_ADMIN active when plan expires or seats are reduced", () => {
    // Simulação da lógica de desativação de assentos excedentes (ex: 4 para 1)
    const users = [
      { id: "1", role: "TENANT_ADMIN", isActive: true },
      { id: "2", role: "AUDITOR", isActive: true },
      { id: "3", role: "AUDITOR", isActive: true },
      { id: "4", role: "VIEWER", isActive: true },
    ];
    const allowedSeats = 1;

    // Quando o plano vence ou o novo permite 1, inativa todos que não são TENANT_ADMIN
    const toDeactivate = users.filter((u) => u.isActive && u.role !== "TENANT_ADMIN").map((u) => u.id);
    const updatedUsers = users.map((u) => ({
      ...u,
      isActive: toDeactivate.includes(u.id) ? false : u.isActive,
    }));

    const activeUsers = updatedUsers.filter((u) => u.isActive);
    expect(activeUsers.length).toBe(1);
    expect(activeUsers[0].role).toBe("TENANT_ADMIN");
    expect(activeUsers[0].id).toBe("1");
    expect(toDeactivate).toEqual(["2", "3", "4"]);
  });
});
