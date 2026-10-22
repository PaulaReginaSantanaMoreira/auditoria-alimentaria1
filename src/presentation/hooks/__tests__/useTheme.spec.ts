import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "../useTheme";

describe("useTheme Hook", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
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
});
