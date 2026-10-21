import { describe, it, expect } from "vitest";
import { Tenant } from "../tenant";

describe("Tenant Entity", () => {
  it("debe crear una instancia de Tenant válida", () => {
    const tenant = new Tenant({
      id: "tenant-123",
      name: "Laboratorios Alimentarios del Sur S.L.",
      cif: "b12345678",
      slug: "lab-del-sur",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(tenant.id).toBe("tenant-123");
    expect(tenant.name).toBe("Laboratorios Alimentarios del Sur S.L.");
    expect(tenant.cif).toBe("B12345678"); // Uppercased
    expect(tenant.isActive()).toBe(true);
  });

  it("debe lanzar un error si el nombre del tenant está vacío", () => {
    expect(() => {
      new Tenant({
        id: "tenant-123",
        name: "",
        cif: "B12345678",
        slug: "test",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }).toThrow("El nombre de la empresa/tenant es obligatorio");
  });

  it("debe suspender y reactivar un tenant adecuadamente", () => {
    const tenant = new Tenant({
      id: "tenant-123",
      name: "Auditorias Iberia",
      cif: "A87654321",
      slug: "auditorias-iberia",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    tenant.suspend();
    expect(tenant.status).toBe("SUSPENDED");
    expect(tenant.isActive()).toBe(false);

    tenant.activate();
    expect(tenant.status).toBe("ACTIVE");
    expect(tenant.isActive()).toBe(true);
  });
});
