import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionMenu, ActionMenuItem } from "../ui/ActionMenu";

describe("ActionMenu Component (Triple AAA Pattern)", () => {
  it("should render action menu trigger with accessible aria labels", () => {
    // Arrange
    const items: ActionMenuItem[] = [
      { id: "edit", label: "Editar", onClick: vi.fn() },
    ];

    // Act
    render(<ActionMenu items={items} label="Acciones de prueba" />);

    // Assert
    const trigger = screen.getByRole("button", { name: "Acciones de prueba" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-haspopup", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("should open menu when trigger is clicked and render items", () => {
    // Arrange
    const items: ActionMenuItem[] = [
      { id: "edit", label: "Editar", icon: "edit", onClick: vi.fn() },
      { id: "delete", label: "Eliminar", icon: "delete", variant: "danger", onClick: vi.fn() },
    ];
    render(<ActionMenu items={items} label="Menú opciones" />);

    // Act
    const trigger = screen.getByRole("button", { name: "Menú opciones" });
    fireEvent.click(trigger);

    // Assert
    const menu = screen.getByRole("menu", { name: "Menú opciones" });
    const editItem = screen.getByRole("menuitem", { name: /Editar/i });
    const deleteItem = screen.getByRole("menuitem", { name: /Eliminar/i });

    expect(menu).toBeInTheDocument();
    expect(editItem).toBeInTheDocument();
    expect(deleteItem).toBeInTheDocument();
  });

  it("should trigger item callback and close menu upon item click", () => {
    // Arrange
    const handleClick = vi.fn();
    const items: ActionMenuItem[] = [
      { id: "edit", label: "Editar Empresa", onClick: handleClick },
    ];
    render(<ActionMenu items={items} label="Menú" />);

    // Act
    const trigger = screen.getByRole("button", { name: "Menú" });
    fireEvent.click(trigger);
    const item = screen.getByRole("menuitem", { name: /Editar Empresa/i });
    fireEvent.click(item);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should close menu when Escape key is pressed", () => {
    // Arrange
    const items: ActionMenuItem[] = [
      { id: "action-1", label: "Opción 1", onClick: vi.fn() },
    ];
    render(<ActionMenu items={items} label="Menú" />);

    // Act
    const trigger = screen.getByRole("button", { name: "Menú" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });

    // Assert
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
