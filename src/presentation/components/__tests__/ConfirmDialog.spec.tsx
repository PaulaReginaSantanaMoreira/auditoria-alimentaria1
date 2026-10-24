import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConfirmDialog, useConfirm } from "../ui/ConfirmDialog";

describe("ConfirmDialog Component (Triple AAA Pattern)", () => {
  it("should render confirm dialog with title, message and accessible role", () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    // Act
    render(
      <ConfirmDialog
        isOpen={true}
        title="¿Confirmar acción?"
        message="¿Está seguro de continuar con esta operación?"
        confirmLabel="Aceptar"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Assert
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("¿Confirmar acción?")).toBeInTheDocument();
    expect(screen.getByText("¿Está seguro de continuar con esta operación?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmación"
        message="Mensaje de prueba"
        confirmLabel="Efectivar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Efectivar" }));

    // Assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("should call onCancel when cancel button is clicked", () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirmación"
        message="Mensaje de prueba"
        cancelLabel="Descartar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("should resolve promise with true when confirmed using useConfirm hook", async () => {
    // Arrange
    let hookResult: ReturnType<typeof useConfirm>;

    function TestComponent() {
      hookResult = useConfirm();
      return (
        <div>
          <button
            type="button"
            onClick={async () => {
              const res = await hookResult.confirm({
                title: "Pregunta hook",
                message: "Texto hook",
                confirmLabel: "Sí",
              });
              if (res) {
                document.body.setAttribute("data-confirmed", "true");
              }
            }}
          >
            Disparar
          </button>
          {hookResult.ConfirmDialogComponent}
        </div>
      );
    }

    render(<TestComponent />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Disparar" }));

    // Assert dialog opened
    expect(screen.getByText("Pregunta hook")).toBeInTheDocument();

    // Confirm
    fireEvent.click(screen.getByRole("button", { name: "Sí" }));

    // Assert resolution
    await waitFor(() => {
      expect(document.body.getAttribute("data-confirmed")).toBe("true");
    });
  });
});
