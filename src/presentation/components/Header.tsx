"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/infrastructure/database/supabase/supabase-client";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useTheme } from "@/presentation/hooks/useTheme";

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
  const pathname = usePathname();
  const { isDark, toggleTheme, mounted } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("auditor@bioauditpro.com");
  const [userRole, setUserRole] = useState("Inspector Sanitario Oficial");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const session = localStorage.getItem("bioaudit_session");
      if (session) {
        const parsed = JSON.parse(session);
        // Verifica se a sessão não expirou
        if (!parsed.expiresAt || Date.now() <= parsed.expiresAt) {
          setIsLoggedIn(true);
          if (parsed.identifier) setUserEmail(parsed.identifier);
          if (parsed.role) {
            const roleLower = String(parsed.role).toLowerCase();
            const isSuper = roleLower === "superadmin" || roleLower.includes("superadmin");
            setIsSuperAdmin(isSuper);
            setUserRole(
              isSuper
                ? "SuperAdmin Master"
                : parsed.role === "auditor"
                ? "Inspector Sanitario Oficial"
                : parsed.role
            );
          }
          // Validação assíncrona remota com Supabase / API para detectar revogação de sessão
          fetch("/api/auth/session")
            .then((res) => {
              if (!res.ok) {
                // Sessão foi invalidada ou revogada no Supabase!
                localStorage.removeItem("bioaudit_session");
                setIsLoggedIn(false);
              }
            })
            .catch(() => {
              // Em caso de offline, mantém réplica local
            });
        } else {
          localStorage.removeItem("bioaudit_session");
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    } catch {
      setIsLoggedIn(false);
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

  const handleLogout = async () => {
    try {
      localStorage.removeItem("bioaudit_session");
      // 1. Invalida a sessão no servidor Supabase com escopo global e limpa os cookies HTTP-only
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "global" }),
      });
    } catch {
      // ignore
    }
    try {
      // 2. Invalida a sessão no cliente Supabase com escopo global
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore
    }
    setIsMenuOpen(false);
    setIsLoggedIn(false);
    window.location.href = "/login";
  };

  const userInitials = (userEmail.split("@")[0] || "AU").slice(0, 2).toUpperCase();

  // SuperAdmin não possui restrições, não tem plano/assinatura e se mantém no painel master
  const isSuper = isSuperAdmin || (pathname ? pathname.startsWith("/superadmin") : false);
  const logoHref = !isLoggedIn ? "/login" : isSuper ? "/superadmin" : "/auditorias/nova";

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-transparent dark:border-slate-800/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe transition-colors duration-200">
      <div className="h-16 px-margin-mobile flex items-center justify-between gap-space-xs max-w-5xl mx-auto">
        <Link href={logoHref} className="flex items-center gap-space-sm min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-status-pass-bg dark:bg-emerald-950/60 flex items-center justify-center text-primary dark:text-emerald-400 shrink-0 shadow-sm border border-emerald-500/20">
            <span className="material-symbols-outlined text-[24px]">verified_user</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-title-md text-title-md text-on-surface dark:text-slate-100 font-bold truncate">
                {title}
              </span>
              {/* SuperAdmin não precisa de plano ativo */}
              {planActive && !isSuper && isLoggedIn && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-status-pass-bg dark:bg-emerald-950/50 text-status-pass dark:text-emerald-400 font-label-sm text-label-sm border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  Plan Activo
                </span>
              )}
            </div>
            <span className="font-label-sm text-label-sm text-slate-subtext dark:text-slate-400 truncate uppercase tracking-wider">
              {subtitle}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* BOTÃO DE DARK MODE GLOBAL (Acessível Logado ou Deslogado) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-emerald-400 hover:bg-surface-container-high dark:hover:bg-slate-800 transition-all cursor-pointer focus:outline-none"
          >
            {mounted && isDark ? (
              <span className="material-symbols-outlined text-[22px] text-amber-400">light_mode</span>
            ) : (
              <span className="material-symbols-outlined text-[22px] text-slate-600 dark:text-slate-300">dark_mode</span>
            )}
          </button>

          {/* SuperAdmin não tem página de assinatura */}
          {isLoggedIn && !isSuper && (
            <Link
              href="/suscripcion"
              aria-label="Gestión de suscripción"
              className="w-10 h-10 flex items-center justify-center text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-emerald-400 rounded-full hover:bg-surface-container-high dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
            </Link>
          )}

          {isLoggedIn && (
            <button
              aria-label="Alertas y Notificaciones Sanitarias"
              className="w-10 h-10 flex items-center justify-center text-on-surface-variant dark:text-slate-300 hover:text-primary dark:hover:text-emerald-400 rounded-full active:bg-surface-container-high dark:active:bg-slate-800 transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
          )}

          {/* Menu Dropdown do Perfil & Deslogar quando logado */}
          {isLoggedIn ? (
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
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-border dark:border-slate-800 py-2 z-50 text-slate-dark dark:text-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Informações da Conta */}
                  <div className="px-4 py-3 border-b border-slate-border/70 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                      {userInitials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-dark dark:text-slate-100 truncate" title={userEmail}>
                        {userEmail}
                      </span>
                      <span className="text-[11px] text-slate-subtext dark:text-slate-400 truncate">
                        {userRole}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="py-1">
                    <Link
                      href="/auditorias/nova"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary dark:text-emerald-400">add_circle</span>
                      <span>Nueva Inspección</span>
                    </Link>

                    {!isSuper && (
                      <Link
                        href="/suscripcion"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-slate-subtext dark:text-slate-400">credit_card</span>
                        <span>Mi Suscripción</span>
                      </Link>
                    )}

                    {!isSuper && (
                      <Link
                        href="/gestao/equipe"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary dark:text-emerald-400">group</span>
                        <span>Equipo e Inspectores</span>
                      </Link>
                    )}

                    <Link
                      href="/superadmin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">admin_panel_settings</span>
                      <span>SuperAdmin Master</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary dark:text-emerald-400">key</span>
                      <span>Cambiar Contraseña</span>
                    </button>

                    <div className="my-1 border-t border-slate-border/70 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-alert-red hover:bg-alert-red-bg/25 dark:hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            pathname !== "/login" && (
              <Link
                href="/login"
                className="h-9 px-3.5 rounded-xl bg-primary text-white font-label-sm text-label-sm font-semibold flex items-center gap-1.5 hover:bg-primary-container transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Acceder</span>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Modal para redefinir senha informando a antiga */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userEmail={userEmail}
      />
    </header>
  );
}
