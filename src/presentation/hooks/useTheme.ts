"use client";

import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  // O tema normal (Light) é SEMPRE o padrão oficial
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      // 1. Prioridade absoluta para parâmetro de URL (ex: links compartilhados em modo claro)
      const searchParams = new URLSearchParams(window.location.search);
      const urlTheme = searchParams.get("theme") || searchParams.get("mode");

      if (urlTheme === "light") {
        setTheme("light");
        document.documentElement.classList.remove("dark");
        return;
      }

      if (urlTheme === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
        return;
      }

      // 2. Leitura do tema armazenado no localStorage (padrão é sempre Light)
      const stored = localStorage.getItem("bioaudit_theme");
      // Dark Mode é estritamente opcional por escolha ativa do usuário
      if (stored === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // Fallback padrão: Light Mode
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    // 3. Listener para garantir que impressão/PDF sempre execute em Modo Claro
    const handleBeforePrint = () => {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-was-dark", "true");
      }
    };

    const handleAfterPrint = () => {
      if (document.documentElement.getAttribute("data-was-dark") === "true") {
        document.documentElement.classList.add("dark");
        document.documentElement.removeAttribute("data-was-dark");
      }
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem("bioaudit_theme", nextTheme);
    } catch {}

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === "dark",
    mounted,
  };
}
