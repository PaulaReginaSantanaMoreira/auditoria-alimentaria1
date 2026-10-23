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
});
