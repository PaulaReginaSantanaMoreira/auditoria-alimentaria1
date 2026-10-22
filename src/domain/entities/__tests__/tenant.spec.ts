import { describe, it, expect } from "vitest";
import { Tenant } from "../tenant";

describe("Tenant Entity", () => {
  it("should successfully instantiate a valid Tenant with contact info", () => {
    // Arrange
    const props = {
      id: "tenant-123",
      name: "Laboratorios Alimentarios del Sur S.L.",
      cif: "b12345678",
      slug: "lab-del-sur",
      status: "ACTIVE" as const,
      address: "Calle Mayor 12, Madrid",
      phone: "+34 912 345 678",
      adminEmail: "admin@labdelsur.es",
      adminName: "Dra. María Sánchez",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Act
    const tenant = new Tenant(props);

    // Assert
    expect(tenant.id).toBe("tenant-123");
    expect(tenant.name).toBe("Laboratorios Alimentarios del Sur S.L.");
    expect(tenant.cif).toBe("B12345678");
    expect(tenant.address).toBe("Calle Mayor 12, Madrid");
    expect(tenant.phone).toBe("+34 912 345 678");
    expect(tenant.adminEmail).toBe("admin@labdelsur.es");
    expect(tenant.adminName).toBe("Dra. María Sánchez");
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

  it("should update contact and admin info correctly", () => {
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
    tenant.updateContactInfo({
      address: "Polígono Industrial Nave 4",
      phone: "600112233",
      adminEmail: "contacto@auditoriasiberia.es",
      adminName: "Juan Pérez",
    });

    // Assert
    expect(tenant.address).toBe("Polígono Industrial Nave 4");
    expect(tenant.phone).toBe("600112233");
    expect(tenant.adminEmail).toBe("contacto@auditoriasiberia.es");
    expect(tenant.adminName).toBe("Juan Pérez");
  });
});
