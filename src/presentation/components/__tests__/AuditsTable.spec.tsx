import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditsTable, AuditListItem } from "../audits/AuditsTable";

describe("AuditsTable Component (Triple AAA Pattern)", () => {
  const mockAudits: AuditListItem[] = [
    {
      id: "audit-1",
      companyName: "Restaurante Central SL",
      companyCif: "B12345678",
      inspectionDate: "2026-10-20T10:00:00Z",
      normativeFramework: "CE 852/2004",
      complianceScore: 92,
      verdict: "FAVORABLE",
      status: "FINALIZED",
      accessScope: "TENANT",
    },
    {
      id: "audit-2",
      companyName: "Carnicería San José",
      companyCif: "B87654321",
      inspectionDate: "2026-10-21T11:00:00Z",
      normativeFramework: "CE 852/2004",
      complianceScore: 55,
      verdict: "DESFAVORABLE",
      status: "IN_PROGRESS",
      accessScope: "TENANT",
    },
  ];

  it("should render audit rows with company details and scores", () => {
    // Arrange
    const onRefresh = vi.fn();

    // Act
    render(<AuditsTable audits={mockAudits} isLoading={false} onRefresh={onRefresh} />);

    // Assert
    expect(screen.getByText("Restaurante Central SL")).toBeInTheDocument();
    expect(screen.getByText("CIF: B12345678")).toBeInTheDocument();
    expect(screen.getByText("Carnicería San José")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("FAVORABLE")).toBeInTheDocument();
    expect(screen.getByText("Finalizada")).toBeInTheDocument();
  });

  it("should filter audit rows when user types in search input", () => {
    // Arrange
    const onRefresh = vi.fn();
    render(<AuditsTable audits={mockAudits} isLoading={false} onRefresh={onRefresh} />);

    // Act
    const searchInput = screen.getByPlaceholderText(/Buscar por empresa, CIF/i);
    fireEvent.change(searchInput, { target: { value: "Carnicería" } });

    // Assert
    expect(screen.getByText("Carnicería San José")).toBeInTheDocument();
    expect(screen.queryByText("Restaurante Central SL")).not.toBeInTheDocument();
  });

  it("should filter audit rows when clicking status filter buttons", () => {
    // Arrange
    const onRefresh = vi.fn();
    render(<AuditsTable audits={mockAudits} isLoading={false} onRefresh={onRefresh} />);

    // Act
    const finalizedFilterBtn = screen.getByRole("button", { name: "Finalizadas" });
    fireEvent.click(finalizedFilterBtn);

    // Assert
    expect(screen.getByText("Restaurante Central SL")).toBeInTheDocument();
    expect(screen.queryByText("Carnicería San José")).not.toBeInTheDocument();
  });

  it("should display empty state with call to action when no audits match", () => {
    // Arrange
    const onRefresh = vi.fn();

    // Act
    render(<AuditsTable audits={[]} isLoading={false} onRefresh={onRefresh} />);

    // Assert
    expect(screen.getByText("No se encontraron inspecciones")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Iniciar Nueva Inspección/i })).toBeInTheDocument();
  });
});
