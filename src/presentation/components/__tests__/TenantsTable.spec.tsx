import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TenantsTable } from "../superadmin/tabs/TenantsTable";
import { TenantItem } from "../superadmin/types";

describe("TenantsTable Component (Triple AAA Pattern)", () => {
  const mockTenants: TenantItem[] = [
    {
      id: "t-1",
      name: "Teste FF",
      cif: "Q8850943E",
      slug: "teste-ff",
      status: "ACTIVE",
      address: "Ej. Teste Fabio",
      adminName: "Fabio Admin",
      adminEmail: "admfabio@test.com.br",
      phone: "+55 71 99100-0000",
      planName: "Plano Piloto",
      planCode: "TRIAL_7D",
      maxUserSeats: 1,
      activeUsersCount: 1,
      paymentStatus: "COURTESY",
      subscriptionStatus: "ACTIVE",
      expiresAt: "2026-10-24T12:00:00Z",
      daysRemaining: 1,
      createdAt: "2026-10-23T12:00:00Z",
    },
  ];

  it("should render company avatar, CIF, address, admin name, email, and phone cleanly", () => {
    // Arrange
    const onRefresh = vi.fn();
    const onOpenEdit = vi.fn();
    const onOpenContract = vi.fn();
    const onOpenRubric = vi.fn();
    const onOpenUsers = vi.fn();
    const onToggleStatus = vi.fn();

    // Act
    render(
      <TenantsTable
        tenants={mockTenants}
        searchTerm=""
        setSearchTerm={vi.fn()}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenEdit={onOpenEdit}
        onOpenContract={onOpenContract}
        onOpenRubric={onOpenRubric}
        onOpenUsers={onOpenUsers}
        onToggleStatus={onToggleStatus}
      />
    );

    // Assert
    expect(screen.getByText("Teste FF")).toBeInTheDocument();
    expect(screen.getByText("TE")).toBeInTheDocument(); // Avatar initial
    expect(screen.getByText("CIF: Q8850943E")).toBeInTheDocument();
    expect(screen.getByText("Ej. Teste Fabio")).toBeInTheDocument();
    expect(screen.getByText("Fabio Admin")).toBeInTheDocument();
    expect(screen.getByText("admfabio@test.com.br")).toBeInTheDocument();
    expect(screen.getByText("+55 71 99100-0000")).toBeInTheDocument();
  });
});
