import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "../Header";

let mockCurrentPath = "/auditorias";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => mockCurrentPath,
}));

describe("Header Component Navigation & Active States (Triple AAA Pattern)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "bioaudit_session",
      JSON.stringify({
        identifier: "admin@bioauditpro.com",
        role: "PLATFORM_SUPERADMIN",
        expiresAt: Date.now() + 100000,
      })
    );
  });

  it("should highlight only 'Historial de Inspecciones' when on /auditorias", () => {
    // Arrange
    mockCurrentPath = "/auditorias";
    render(<Header />);

    // Act: Open user menu
    const profileBtn = screen.getByLabelText(/Perfil y opciones de sesión/i);
    fireEvent.click(profileBtn);

    // Assert: Find links
    const historyLink = screen.getByRole("link", { name: /Historial de Inspecciones/i });
    const newAuditLink = screen.getByRole("link", { name: /Nueva Inspección/i });

    expect(historyLink.className).toContain("text-primary");
    expect(newAuditLink.className).not.toContain("text-primary");
  });

  it("should highlight only 'Nueva Inspección' when on /auditorias/nova", () => {
    // Arrange
    mockCurrentPath = "/auditorias/nova";
    render(<Header />);

    // Act: Open user menu
    const profileBtn = screen.getByLabelText(/Perfil y opciones de sessão|Perfil y opciones de sesión/i);
    fireEvent.click(profileBtn);

    // Assert: Find links
    const historyLink = screen.getByRole("link", { name: /Historial de Inspecciones/i });
    const newAuditLink = screen.getByRole("link", { name: /Nueva Inspección/i });

    expect(newAuditLink.className).toContain("text-primary");
    expect(historyLink.className).not.toContain("text-primary");
  });

  describe("RBAC Permissions in Header Menu across All Roles", () => {
    it("PLATFORM_SUPERADMIN sees Gobernanza and Inspecciones, but not Mi Suscripción button or plan badge", () => {
      localStorage.setItem(
        "bioaudit_session",
        JSON.stringify({
          identifier: "superadmin@bioauditpro.com",
          role: "PLATFORM_SUPERADMIN",
          expiresAt: Date.now() + 100000,
        })
      );
      mockCurrentPath = "/superadmin";
      render(<Header />);

      // Top bar checks: SuperAdmin has no Plan Activo badge and no Mi Suscripción button
      expect(screen.queryByText(/Plan Activo/i)).toBeNull();
      expect(screen.queryByLabelText(/Gestión de suscripción/i)).toBeNull();

      // Open menu
      fireEvent.click(screen.getByLabelText(/Perfil y opciones de sesión/i));

      // Assert SuperAdmin menu items
      expect(screen.getByRole("link", { name: /Gobernanza de la Plataforma/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Planes de Suscripción/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Historial de Inspecciones/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Nueva Inspección/i })).toBeDefined();
      expect(screen.queryByRole("link", { name: /Equipo e Inspectores/i })).toBeNull();
    });

    it("TENANT_ADMIN sees Inspecciones and Organización (Equipo and Suscripción), but not Gobernanza", () => {
      localStorage.setItem(
        "bioaudit_session",
        JSON.stringify({
          identifier: "admin@empresa.com",
          role: "TENANT_ADMIN",
          expiresAt: Date.now() + 100000,
        })
      );
      mockCurrentPath = "/auditorias";
      render(<Header />);

      // Top bar checks: Tenant Admin has Plan Activo badge and Mi Suscripción button
      expect(screen.getByText(/Plan Activo/i)).toBeDefined();
      expect(screen.getByLabelText(/Gestión de suscripción/i)).toBeDefined();

      // Open menu
      fireEvent.click(screen.getByLabelText(/Perfil y opciones de sesión/i));

      // Assert Tenant Admin menu items
      expect(screen.queryByRole("link", { name: /Gobernanza de la Plataforma/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /Planes de Suscripción/i })).toBeNull();
      expect(screen.getByRole("link", { name: /Historial de Inspecciones/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Nueva Inspección/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Equipo e Inspectores/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Mi Suscripción/i })).toBeDefined();
    });

    it("AUDITOR sees Inspecciones but not Gobernanza nor Organización", () => {
      localStorage.setItem(
        "bioaudit_session",
        JSON.stringify({
          identifier: "inspector@empresa.com",
          role: "AUDITOR",
          expiresAt: Date.now() + 100000,
        })
      );
      mockCurrentPath = "/auditorias";
      render(<Header />);

      // Top bar checks: Auditor has Plan Activo badge but NO Mi Suscripción button
      expect(screen.getByText(/Plan Activo/i)).toBeDefined();
      expect(screen.queryByLabelText(/Gestión de suscripción/i)).toBeNull();

      // Open menu
      fireEvent.click(screen.getByLabelText(/Perfil y opciones de sesión/i));

      // Assert Auditor menu items
      expect(screen.queryByRole("link", { name: /Gobernanza de la Plataforma/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /Equipo e Inspectores/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /Mi Suscripción/i })).toBeNull();
      expect(screen.getByRole("link", { name: /Historial de Inspecciones/i })).toBeDefined();
      expect(screen.getByRole("link", { name: /Nueva Inspección/i })).toBeDefined();
    });

    it("VIEWER has read-only Consultas and CANNOT see Nueva Inspección nor Gobernanza nor Organización", () => {
      localStorage.setItem(
        "bioaudit_session",
        JSON.stringify({
          identifier: "viewer@empresa.com",
          role: "VIEWER",
          expiresAt: Date.now() + 100000,
        })
      );
      mockCurrentPath = "/auditorias";
      render(<Header />);

      // Top bar checks: Viewer has Plan Activo badge but NO Mi Suscripción button
      expect(screen.getByText(/Plan Activo/i)).toBeDefined();
      expect(screen.queryByLabelText(/Gestión de suscripción/i)).toBeNull();

      // Open menu
      fireEvent.click(screen.getByLabelText(/Perfil y opciones de sesión/i));

      // Assert VIEWER menu items
      expect(screen.queryByRole("link", { name: /Gobernanza de la Plataforma/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /Equipo e Inspectores/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /Mi Suscripción/i })).toBeNull();
      expect(screen.getByText(/Consultas/i)).toBeDefined();
      expect(screen.getByRole("link", { name: /Historial de Inspecciones/i })).toBeDefined();
      // Crucial: VIEWER does not have audit:create permission!
      expect(screen.queryByRole("link", { name: /Nueva Inspección/i })).toBeNull();
    });
  });
});
