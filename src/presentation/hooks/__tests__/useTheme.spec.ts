import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../useTheme";

describe("useTheme Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    window.history.replaceState({}, "", "/");
  });

  it("should initialize with light mode by default", () => {
    // Arrange & Act
    const { result } = renderHook(() => useTheme());

    // Assert
    expect(result.current.theme).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should toggle between light and dark modes and persist in localStorage", () => {
    // Arrange
    const { result } = renderHook(() => useTheme());

    // Act
    act(() => {
      result.current.toggleTheme();
    });

    // Assert
    expect(result.current.theme).toBe("dark");
    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem("bioaudit_theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should prioritize ?theme=light from URL when sharing an inspection even if localStorage was dark", () => {
    // Arrange: Simula usuário em dark mode que abre um link compartilhado ?theme=light
    localStorage.setItem("bioaudit_theme", "dark");
    window.history.replaceState({}, "", "/auditorias/123/relatorio?theme=light");

    // Act
    const { result } = renderHook(() => useTheme());

    // Assert: O tema DEVE ser forçado a light mode
    expect(result.current.theme).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should strip dark class on beforeprint and restore on afterprint during printing/PDF generation", () => {
    // Arrange: Usuário em dark mode
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.toggleTheme();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Act: Dispara evento nativo de impressão (Ctrl+P / window.print())
    window.dispatchEvent(new Event("beforeprint"));

    // Assert: Durante a impressão DEVE estar em modo claro sem a classe dark
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-was-dark")).toBe("true");

    // Act: Dispara encerramento do diálogo de impressão
    window.dispatchEvent(new Event("afterprint"));

    // Assert: Restaura o dark mode pós-impressão
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.hasAttribute("data-was-dark")).toBe(false);
  });
});
