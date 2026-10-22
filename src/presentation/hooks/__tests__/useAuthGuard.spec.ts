import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthGuard } from "../useAuthGuard";

describe("useAuthGuard Hook", () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();
  const mockRouter = {
    replace: mockReplace,
    push: mockPush,
  };
  const mockPathname = "/auditorias/nova";

  beforeEach(() => {
    localStorage.clear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should redirect to /login when no session exists and server reports unauthenticated", async () => {
    // Arrange
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
    });

    // Act
    renderHook(() =>
      useAuthGuard({
        router: mockRouter,
        pathname: mockPathname,
        fetchFn: mockFetch as any,
      })
    );

    // Assert
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login?redirect=%2Fauditorias%2Fnova");
    });
  });

  it("should hydrate session from server cookie token when localStorage is empty", async () => {
    // Arrange
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        user: {
          id: "superadmin-123",
          email: "admin@bioauditpro.com",
          role: "PLATFORM_SUPERADMIN",
        },
      }),
    });

    // Act
    const { result } = renderHook(() =>
      useAuthGuard({
        router: mockRouter,
        pathname: "/superadmin",
        requiredRole: "PLATFORM_SUPERADMIN",
        fetchFn: mockFetch as any,
      })
    );

    // Assert
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
    expect(result.current.session?.identifier).toBe("admin@bioauditpro.com");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(localStorage.getItem("bioaudit_session")).toContain("admin@bioauditpro.com");
  });

  it("should redirect to /login when session is expired and server reports 401", async () => {
    // Arrange
    const expiredSession = {
      identifier: "auditor@bioauditpro.com",
      role: "AUDITOR",
      expiresAt: Date.now() - 1000,
    };
    localStorage.setItem("bioaudit_session", JSON.stringify(expiredSession));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
    });

    // Act
    renderHook(() =>
      useAuthGuard({
        router: mockRouter,
        pathname: mockPathname,
        fetchFn: mockFetch as any,
      })
    );

    // Assert
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/login?redirect=%2Fauditorias%2Fnova"
      );
    });
    expect(localStorage.getItem("bioaudit_session")).toBeNull();
  });

  it("should allow access immediately when valid session exists in localStorage", () => {
    // Arrange
    const validSession = {
      identifier: "auditor@bioauditpro.com",
      role: "AUDITOR",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("bioaudit_session", JSON.stringify(validSession));

    // Act
    const { result } = renderHook(() =>
      useAuthGuard({
        router: mockRouter,
        pathname: mockPathname,
      })
    );

    // Assert
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.identifier).toBe("auditor@bioauditpro.com");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("should redirect when role requirement is not satisfied", () => {
    // Arrange
    const auditorSession = {
      identifier: "auditor@bioauditpro.com",
      role: "AUDITOR",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("bioaudit_session", JSON.stringify(auditorSession));

    // Act
    renderHook(() =>
      useAuthGuard({
        router: mockRouter,
        pathname: "/superadmin",
        requiredRole: "PLATFORM_SUPERADMIN",
      })
    );

    // Assert
    expect(mockReplace).toHaveBeenCalledWith("/auditorias/nova?error=unauthorized_role");
  });
});
