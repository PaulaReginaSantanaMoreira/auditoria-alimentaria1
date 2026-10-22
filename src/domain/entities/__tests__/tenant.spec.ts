import { describe, it, expect } from "vitest";
import { Tenant } from "../tenant";

describe("Tenant Entity", () => {
  it("should successfully instantiate a valid Tenant", () => {
    // Arrange
    const props = {
      id: "tenant-123",
      name: "Laboratorios Alimentarios del Sur S.L.",
      cif: "b12345678",
      slug: "lab-del-sur",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act
    const tenant = new Tenant(props);

    // Assert
    expect(tenant.id).toBe("tenant-123");
    expect(tenant.name).toBe("Laboratorios Alimentarios del Sur S.L.");
    expect(tenant.cif).toBe("B12345678");
    expect(tenant.isActive()).toBe(true);
  });

  it("should throw an error when the tenant name is empty", () => {
    // Arrange
    const invalidProps = {
      id: "tenant-123",
      name: "",
      cif: "B12345678",
      slug: "test",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act & Assert
    expect(() => new Tenant(invalidProps)).toThrow("El nombre de la empresa/tenant es obligatorio");
  });

  it("should correctly suspend and reactivate a tenant status", () => {
    // Arrange
    const tenant = new Tenant({
      id: "tenant-123",
      name: "Auditorias Iberia",
      cif: "A87654321",
      slug: "auditorias-iberia",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Act
    tenant.suspend();
    const isSuspendedActive = tenant.isActive();
    const suspendedStatus = tenant.status;

    tenant.activate();
    const isReactivated = tenant.isActive();
    const activeStatus = tenant.status;

    // Assert
    expect(suspendedStatus).toBe("SUSPENDED");
    expect(isSuspendedActive).toBe(false);
    expect(activeStatus).toBe("ACTIVE");
    expect(isReactivated).toBe(true);
  });
});
