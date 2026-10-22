import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthGuard, AuthLoadingScreen } from "../AuthGuard";

describe("AuthGuard & AuthLoadingScreen Components", () => {
  const mockReplace = vi.fn();
  const mockRouter = { replace: mockReplace };

  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render AuthLoadingScreen with generic default message without specifying credential type", () => {
    // Arrange & Act
    render(<AuthLoadingScreen />);

    // Assert
    const statusContainer = screen.getByRole("status");
    expect(statusContainer).toBeInTheDocument();
    expect(screen.getByText("Verificando credenciales...")).toBeInTheDocument();
  });

  it("should render AuthLoadingScreen with status role and custom message", () => {
    // Arrange & Act
    render(<AuthLoadingScreen message="Comprobando autorización..." />);

    // Assert
    const statusContainer = screen.getByRole("status");
    expect(statusContainer).toBeInTheDocument();
    expect(screen.getByText("Comprobando autorización...")).toBeInTheDocument();
  });

  it("should display loading screen and redirect when no session exists", async () => {
    // Arrange & Act
    render(
      <AuthGuard router={mockRouter} pathname="/auditorias/nova">
        <div data-testid="protected-content">Conteúdo Protegido</div>
      </AuthGuard>
    );

    // Assert
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?redirect=%2Fauditorias%2Fnova");
    });
  });

  it("should render children when session is valid", () => {
    // Arrange
    const validSession = {
      identifier: "auditor@bioauditpro.com",
      role: "AUDITOR",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("bioaudit_session", JSON.stringify(validSession));

    // Act
    render(
      <AuthGuard router={mockRouter} pathname="/auditorias/nova">
        <div data-testid="protected-content">Conteúdo Protegido</div>
      </AuthGuard>
    );

    // Assert
    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should pass session object to render prop children", () => {
    // Arrange
    const validSession = {
      identifier: "auditor@bioauditpro.com",
      role: "AUDITOR",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("bioaudit_session", JSON.stringify(validSession));

    // Act
    render(
      <AuthGuard router={mockRouter} pathname="/auditorias/nova">
        {(session) => (
          <div data-testid="session-user">Usuário: {session.identifier}</div>
        )}
      </AuthGuard>
    );

    // Assert
    expect(screen.getByTestId("session-user")).toHaveTextContent(
      "Usuário: auditor@bioauditpro.com"
    );
  });
});
