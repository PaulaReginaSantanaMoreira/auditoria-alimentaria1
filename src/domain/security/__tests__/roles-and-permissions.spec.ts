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
});
