"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  planActive?: boolean;
}

export function Header({
  title = "BioAudit Pro",
  subtitle = "Rúbrica",
  planActive = true,
}: HeaderProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("auditor@sanidad.es");
  const [userRole, setUserRole] = useState("Inspector Sanitario Oficial");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const session = localStorage.getItem("bioaudit_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.identifier) setUserEmail(parsed.identifier);
        if (parsed.role) setUserRole(parsed.role === "auditor" ? "Inspector Sanitario Oficial" : parsed.role);
      }
    } catch {
      // fallback
    }
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("bioaudit_session");
    } catch {
      // ignore
    }
    setIsMenuOpen(false);
    router.push("/login");
  };

  const userInitials = (userEmail.split("@")[0] || "AU").slice(0, 2).toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
      <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-xs max-w-5xl mx-auto">
        <Link href="/auditorias/nova" className="flex items-center gap-space-sm min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-status-pass-bg flex items-center justify-center text-primary shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-md text-title-md text-on-surface font-bold truncate">
                {title}
              </span>
              {planActive && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-status-pass-bg text-status-pass font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  Plan Activo
                </span>
              )}
            </div>
            <span className="font-label-sm text-label-sm text-slate-subtext truncate uppercase tracking-wider">
              {subtitle}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-space-xs shrink-0">
          <Link
            href="/suscripcion"
            aria-label="Gestión de suscripción"
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">credit_card</span>
          </Link>
          <button
            aria-label="Alertas y Notificaciones Sanitarias"
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant rounded-full active:bg-surface-container-high transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>

          {/* Menu Dropdown do Perfil & Deslogar */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Perfil y opciones de sesión"
              aria-expanded={isMenuOpen}
              className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs ring-2 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer focus:outline-none"
            >
              {userInitials}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-slate-border py-2 z-50 text-slate-dark animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Informações da Conta */}
                <div className="px-4 py-3 border-b border-slate-border/70 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-dark truncate" title={userEmail}>
                      {userEmail}
                    </span>
                    <span className="text-[11px] text-slate-subtext truncate">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="py-1">
                  <Link
                    href="/auditorias/nova"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark hover:bg-slate-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                    <span>Nueva Inspección</span>
                  </Link>

                  <Link
                    href="/suscripcion"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark hover:bg-slate-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-slate-subtext">credit_card</span>
                    <span>Mi Suscripción</span>
                  </Link>

                  <div className="my-1 border-t border-slate-border/70" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-alert-red hover:bg-alert-red-bg/25 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
