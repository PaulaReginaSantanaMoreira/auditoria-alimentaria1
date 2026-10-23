"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/infrastructure/database/supabase/supabase-client";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { EditProfileModal } from "./EditProfileModal";
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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("auditor@bioauditpro.com");
  const [userRole, setUserRole] = useState("Inspector Sanitario Oficial");
  const [userRoleRaw, setUserRoleRaw] = useState("AUDITOR");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; cif: string; role: string }>>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isTenantSwitchOpen, setIsTenantSwitchOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const tenantSwitchRef = useRef<HTMLDivElement>(null);

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
            setUserRoleRaw(parsed.role);
            const roleLower = String(parsed.role).toLowerCase();
            const isSuper = roleLower === "superadmin" || roleLower.includes("superadmin");
            setIsSuperAdmin(isSuper);
            setUserRole(
              isSuper
                ? "Administrador de la Plataforma"
                : parsed.role === "TENANT_ADMIN" || parsed.role === "tenant_admin"
                ? "Administrador de Empresa"
                : parsed.role === "VIEWER" || parsed.role === "viewer"
                ? "Auditor Consulta (Viewer)"
                : "Inspector Sanitario Oficial"
            );
          }
          if (parsed.tenantId) {
            setActiveTenantId(parsed.tenantId);
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

  // Buscar lista de organizações vinculadas ao usuário logado
  useEffect(() => {
    if (isLoggedIn) {
      fetch("/api/auth/tenants")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.tenants) {
            setTenants(data.tenants);
            if (data.activeTenantId) {
              setActiveTenantId(data.activeTenantId);
            }
          }
        })
        .catch(() => {});
    }
  }, [isLoggedIn]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (tenantSwitchRef.current && !tenantSwitchRef.current.contains(event.target as Node)) {
        setIsTenantSwitchOpen(false);
      }
    };
    if (isMenuOpen || isTenantSwitchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, isTenantSwitchOpen]);

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const res = await fetch("/api/auth/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveTenantId(tenantId);
        setIsTenantSwitchOpen(false);
        const session = localStorage.getItem("bioaudit_session");
        if (session) {
          const parsed = JSON.parse(session);
          parsed.role = data.role;
          parsed.tenantId = tenantId;
          localStorage.setItem("bioaudit_session", JSON.stringify(parsed));
        }
        window.location.reload();
      } else {
        alert(data.error || "Error al cambiar de empresa activa.");
      }
    } catch {
      alert("Error de conexión al cambiar de empresa activa.");
    }
  };

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

  const isRouteActive = (route: string) => {
    if (!pathname) return false;
    if (route === "/superadmin") {
      return pathname === "/superadmin";
    }
    if (route === "/superadmin/planos") {
      return pathname.startsWith("/superadmin/planos");
    }
    if (route === "/auditorias/nova") {
      return pathname === "/auditorias/nova";
    }
    if (route === "/auditorias") {
      return pathname === "/auditorias" || (pathname.startsWith("/auditorias/") && pathname !== "/auditorias/nova");
    }
    return pathname === route || pathname.startsWith(route + "/");
  };

  const getMenuItemClasses = (route: string) => {
    const active = isRouteActive(route);
    if (active) {
      return "flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold bg-primary/10 dark:bg-emerald-950/50 text-primary dark:text-emerald-400 rounded-xl mx-1.5 transition-colors";
    }
    return "flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 rounded-xl mx-1.5 transition-colors";
  };

  const getMenuIconClasses = (route: string) => {
    const active = isRouteActive(route);
    if (active) {
      return "material-symbols-outlined text-[18px] text-primary dark:text-emerald-400";
    }
    return "material-symbols-outlined text-[18px] text-slate-subtext dark:text-slate-400";
  };

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
          {/* SELETOR DE ORGANIZAÇÃO (TENANT SWITCHER) */}
          {isLoggedIn && tenants.length > 0 && (
            <div className="relative hidden sm:block" ref={tenantSwitchRef}>
              <button
                type="button"
                onClick={() => setIsTenantSwitchOpen((prev) => !prev)}
                className="h-8 px-2.5 rounded-xl bg-surface-container-low hover:bg-primary/10 hover:text-primary text-on-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-border/80 shadow-sm"
                title={
                  isSuperAdmin && (!activeTenantId || activeTenantId === "global")
                    ? "Modo Plataforma Global (Sin Tenant vinculado)"
                    : "Empresa activa seleccionada"
                }
              >
                <span className="material-symbols-outlined text-[16px] text-primary">
                  {isSuperAdmin && (!activeTenantId || activeTenantId === "global") ? "shield" : "domain"}
                </span>
                <span className="truncate max-w-[130px] md:max-w-[190px]">
                  {isSuperAdmin && (!activeTenantId || activeTenantId === "global")
                    ? "🛡️ Plataforma Global"
                    : tenants.find((t) => t.id === activeTenantId)?.name || "Mi Empresa"}
                </span>
                {tenants.length > 1 && (
                  <span className="material-symbols-outlined text-[15px] text-slate-subtext">arrow_drop_down</span>
                )}
              </button>

              {isTenantSwitchOpen && tenants.length > 1 && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-border py-1.5 z-50 text-slate-dark dark:text-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-subtext uppercase tracking-wider border-b border-slate-border/60">
                    {isSuperAdmin ? "Ámbito Operativo / Empresas" : `Mis Organizaciones (${tenants.length})`}
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {tenants.map((t) => {
                      const isSelected =
                        t.id === activeTenantId ||
                        (t.id === "global" && (!activeTenantId || activeTenantId === "global"));

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSwitchTenant(t.id)}
                          className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-surface-container transition-colors cursor-pointer ${
                            isSelected
                              ? "font-bold text-primary bg-primary/10 dark:bg-emerald-950/40"
                              : "text-on-surface"
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-semibold flex items-center gap-1.5">
                              {t.id === "global" && (
                                <span className="material-symbols-outlined text-primary text-[15px]">shield</span>
                              )}
                              <span>{t.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-subtext font-mono">
                              {t.id === "global" ? "Autoridad Sanitaria • Sin Tenant" : `CIF: ${t.cif} • ${t.role}`}
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[16px] shrink-0">
                              check_circle
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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

          {/* O Administrador de empresa é o único que poderá visualizar o botão de subscrição */}
          {isLoggedIn && (userRoleRaw === "TENANT_ADMIN" || userRoleRaw === "tenant_admin") && (
            <Link
              href="/suscripcion"
              aria-label="Gestión de suscripción"
              title="Mi Suscripción Oficial"
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
                      href="/auditorias"
                      onClick={() => setIsMenuOpen(false)}
                      className={getMenuItemClasses("/auditorias")}
                    >
                      <span className={getMenuIconClasses("/auditorias")}>assignment</span>
                      <span>Historial de Inspecciones</span>
                    </Link>

                    <Link
                      href="/auditorias/nova"
                      onClick={() => setIsMenuOpen(false)}
                      className={getMenuItemClasses("/auditorias/nova")}
                    >
                      <span className={getMenuIconClasses("/auditorias/nova")}>add_circle</span>
                      <span>Nueva Inspección</span>
                    </Link>

                    {(userRoleRaw === "TENANT_ADMIN" || userRoleRaw === "tenant_admin") && (
                      <Link
                        href="/suscripcion"
                        onClick={() => setIsMenuOpen(false)}
                        className={getMenuItemClasses("/suscripcion")}
                      >
                        <span className={getMenuIconClasses("/suscripcion")}>credit_card</span>
                        <span>Mi Suscripción</span>
                      </Link>
                    )}

                    {(userRoleRaw === "TENANT_ADMIN" || userRoleRaw === "tenant_admin" || isSuper) && (
                      <Link
                        href="/gestao/equipe"
                        onClick={() => setIsMenuOpen(false)}
                        className={getMenuItemClasses("/gestao/equipe")}
                      >
                        <span className={getMenuIconClasses("/gestao/equipe")}>group</span>
                        <span>Equipo e Inspectores</span>
                      </Link>
                    )}

                    {isSuper && (
                      <>
                        <Link
                          href="/superadmin"
                          onClick={() => setIsMenuOpen(false)}
                          className={getMenuItemClasses("/superadmin")}
                        >
                          <span className={getMenuIconClasses("/superadmin")}>admin_panel_settings</span>
                          <span>Gobernanza de la Plataforma</span>
                        </Link>

                        <Link
                          href="/superadmin/planos"
                          onClick={() => setIsMenuOpen(false)}
                          className={getMenuItemClasses("/superadmin/planos")}
                        >
                          <span className={getMenuIconClasses("/superadmin/planos")}>loyalty</span>
                          <span>Planes de Suscripción</span>
                        </Link>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsEditProfileOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 rounded-xl mx-1.5 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-subtext dark:text-slate-400">person</span>
                      <span>Mis Datos / Perfil</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-dark dark:text-slate-200 hover:bg-slate-surface dark:hover:bg-slate-800 rounded-xl mx-1.5 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-slate-subtext dark:text-slate-400">key</span>
                      <span>Cambiar Contraseña</span>
                    </button>

                    <div className="my-1 border-t border-slate-border/70 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-alert-red hover:bg-alert-red-bg/25 dark:hover:bg-red-950/40 rounded-xl mx-1.5 transition-colors text-left cursor-pointer"
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

      {/* Modal para editar os próprios dados de usuário (Documento inalterável) */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onProfileUpdated={(updated) => {
          if (updated.email) setUserEmail(updated.email);
        }}
      />
    </header>
  );
}
