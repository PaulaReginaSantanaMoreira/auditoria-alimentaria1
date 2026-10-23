import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlansTable } from "../superadmin/plans/PlansTable";
import { PlanItem } from "../superadmin/types";

describe("PlansTable Component (Triple AAA Pattern)", () => {
  const mockPlans: PlanItem[] = [
    {
      id: "p-trial",
      name: "Plano Piloto Bonificado",
      code: "TRIAL_7D",
      description: "Plano default de 7 dias",
      durationDays: 7,
      maxUserSeats: 1,
      price: 0,
      currency: "EUR",
      isDefault: true,
      isActive: true,
    },
    {
      id: "p-pro",
      name: "Plano Profissional",
      code: "PRO_30D",
      description: "Plano Pro 30 dias",
      durationDays: 30,
      maxUserSeats: 5,
      price: 29,
      currency: "EUR",
      isDefault: false,
      isActive: true,
    },
  ];

  it("should render plans table with default plan badge and details", () => {
    // Arrange
    const onRefresh = vi.fn();
    const onOpenCreate = vi.fn();
    const onOpenEdit = vi.fn();
    const onToggleStatus = vi.fn();
    const onSetDefault = vi.fn();

    // Act
    render(
      <PlansTable
        plans={mockPlans}
        isLoading={false}
        onRefresh={onRefresh}
        onOpenCreate={onOpenCreate}
        onOpenEdit={onOpenEdit}
        onToggleStatus={onToggleStatus}
        onSetDefault={onSetDefault}
      />
    );

    // Assert
    expect(screen.getByText("Plano Piloto Bonificado")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("Bonificado (0,00 €)")).toBeInTheDocument();
    expect(screen.getByText("Plano Profissional")).toBeInTheDocument();
    expect(screen.getByText("7 días")).toBeInTheDocument();
    expect(screen.getByText("1 inspector")).toBeInTheDocument();
    expect(screen.getByText("5 inspectores")).toBeInTheDocument();
  });

  it("should display empty state with create plan button when no plans exist", () => {
    // Arrange
    const onOpenCreate = vi.fn();

    // Act
    render(
      <PlansTable
        plans={[]}
        isLoading={false}
        onRefresh={vi.fn()}
        onOpenCreate={onOpenCreate}
        onOpenEdit={vi.fn()}
        onToggleStatus={vi.fn()}
        onSetDefault={vi.fn()}
      />
    );

    // Assert
    expect(screen.getByText("No hay planes configurados")).toBeInTheDocument();
    const createBtn = screen.getByRole("button", { name: /Crear Primer Plan/i });
    fireEvent.click(createBtn);
    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });
});
